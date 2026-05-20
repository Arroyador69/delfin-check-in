import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import {
  getPlatformOwnerEmails,
  isEffectiveSuperAdminPayload,
  isPlatformOwnerEmail,
} from '@/lib/platform-owner';
import { sendEmail } from '@/lib/email';
import { sql } from '@/lib/db';
import { buildWaitlistBroadcastEmail } from '@/lib/waitlist-emails';

const CAMPAIGN_KEY_PREFIX = 'waitlist_broadcast';

function getCampaignKey(): string {
  const now = new Date();
  return `${CAMPAIGN_KEY_PREFIX}_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const postSchema = z.object({
  mode: z.enum(['test', 'broadcast']),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(8000),
  audience: z.enum(['pending', 'all', 'selected']).optional(),
  emails: z.array(z.string().email()).optional(),
  confirmSend: z.boolean().optional(),
});

async function requirePlatformOwner(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;
  if (!authToken) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  const payload = verifyToken(authToken);
  if (!payload || !isEffectiveSuperAdminPayload(payload)) {
    return { error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) };
  }
  if (!isPlatformOwnerEmail(payload.email)) {
    return {
      error: NextResponse.json(
        { error: 'Solo la cuenta oficial de plataforma puede enviar comunicaciones waitlist' },
        { status: 403 }
      ),
    };
  }
  return { payload };
}

async function resolveRecipients(
  audience: 'pending' | 'all' | 'selected',
  emails?: string[]
): Promise<Array<{ email: string; name: string | null }>> {
  if (audience === 'selected' && emails?.length) {
    const normalized = [...new Set(emails.map(normalizeEmail))];
    const rows = await sql`
      SELECT email, name FROM waitlist
      WHERE LOWER(TRIM(email)) = ANY(${normalized as any})
      ORDER BY created_at ASC
    `;
    return rows.rows as { email: string; name: string | null }[];
  }

  if (audience === 'all') {
    const rows = await sql`
      SELECT email, name FROM waitlist ORDER BY created_at ASC
    `;
    return rows.rows as { email: string; name: string | null }[];
  }

  const rows = await sql`
    SELECT email, name FROM waitlist
    WHERE activated_at IS NULL
    ORDER BY created_at ASC
  `;
  return rows.rows as { email: string; name: string | null }[];
}

/**
 * GET — waitlist + campañas recientes de comunicación.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformOwner(req);
  if ('error' in auth && auth.error) return auth.error;

  const sessionEmail = normalizeEmail(String(auth.payload?.email || ''));

  const stats = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE activated_at IS NULL)::int AS pending,
      COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::int AS activated
    FROM waitlist
  `;
  const s = stats.rows[0] as { total: number; pending: number; activated: number };

  let recentCampaigns: Array<{
    campaign_key: string;
    sent_count: number;
    opened_count: number;
  }> = [];

  try {
    const meta = await sql`SELECT to_regclass('public.email_tracking') as reg`;
    if (meta.rows[0]?.reg) {
      const camps = await sql`
        SELECT
          metadata->>'campaign_key' AS campaign_key,
          COUNT(*)::int AS sent_count,
          COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened_count
        FROM email_tracking
        WHERE email_type = 'waitlist_broadcast'
          AND metadata->>'campaign_key' IS NOT NULL
        GROUP BY metadata->>'campaign_key'
        ORDER BY MAX(created_at) DESC
        LIMIT 12
      `;
      recentCampaigns = camps.rows as typeof recentCampaigns;
    }
  } catch (e) {
    console.warn('waitlist-broadcast GET campaigns:', e);
  }

  return NextResponse.json({
    success: true,
    stats: s,
    defaultTestEmail: sessionEmail,
    allowedTestEmails: getPlatformOwnerEmails(),
    recentCampaigns,
  });
}

/**
 * POST — prueba a tu email o envío a la waitlist.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePlatformOwner(req);
  if ('error' in auth && auth.error) return auth.error;

  try {
    const body = await req.json();
    const data = postSchema.parse(body);
    const sessionEmail = normalizeEmail(String(auth.payload?.email || ''));

    const adminBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'https://admin.delfincheckin.com';

    const campaignKey = getCampaignKey();
    const from =
      process.env.SMTP_FROM_ONBOARDING ||
      process.env.ZOHO_FROM_EMAIL ||
      process.env.SMTP_FROM_EMAIL ||
      'Delfín Check-in <noreply@delfincheckin.com>';

    if (data.mode === 'test') {
      if (!isPlatformOwnerEmail(sessionEmail)) {
        return NextResponse.json({ error: 'Email de sesión no permitido' }, { status: 403 });
      }

      let trackingId: string | null = null;
      try {
        const meta = await sql`SELECT to_regclass('public.email_tracking') as reg`;
        if (meta.rows[0]?.reg) {
          const ins = await sql`
            INSERT INTO email_tracking (
              tenant_id, email_type, recipient_email, subject, status, metadata
            ) VALUES (
              NULL, 'waitlist_broadcast', ${sessionEmail},
              ${`[PRUEBA] ${data.subject}`}, 'sent',
              ${JSON.stringify({
                campaign_key: campaignKey,
                test: true,
                sentBy: auth.payload?.userId,
              })}::jsonb
            )
            RETURNING id
          `;
          trackingId = String(ins.rows[0]?.id || '');
        }
      } catch (e) {
        console.warn('tracking test:', e);
      }

      const { html, text, subject } = buildWaitlistBroadcastEmail({
        userName: 'Prueba',
        message: data.message,
        subject: data.subject,
        trackingId: trackingId || undefined,
        adminBaseUrl,
      });

      const result = await sendEmail({
        from,
        to: sessionEmail,
        subject: `[PRUEBA] ${subject}`,
        html,
        text,
      });

      if (trackingId && result.messageId) {
        try {
          await sql`
            UPDATE email_tracking SET message_id = ${result.messageId}, updated_at = NOW()
            WHERE id = ${trackingId}::uuid
          `;
        } catch {
          /* ignore */
        }
      }

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Prueba enviada a ${sessionEmail}. Revisa bandeja y Spam.`
          : result.error || 'Error al enviar',
        campaign_key: campaignKey,
      });
    }

    if (!data.confirmSend) {
      return NextResponse.json(
        { error: 'Debes confirmar el envío masivo (confirmSend: true)' },
        { status: 400 }
      );
    }

    const audience = data.audience || 'pending';
    const recipients = await resolveRecipients(audience, data.emails);

    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay destinatarios para esta audiencia',
        sent: 0,
        campaign_key: campaignKey,
      });
    }

    const results: Array<{ email: string; success: boolean; error?: string }> = [];
    let sent = 0;

    for (const r of recipients) {
      const email = normalizeEmail(r.email);
      const displayName = (r.name || email.split('@')[0] || 'amigo/a').trim();

      try {
        let trackingId: string | null = null;
        try {
          const meta = await sql`SELECT to_regclass('public.email_tracking') as reg`;
          if (meta.rows[0]?.reg) {
            const ins = await sql`
              INSERT INTO email_tracking (
                tenant_id, email_type, recipient_email, subject, status, metadata
              ) VALUES (
                NULL, 'waitlist_broadcast', ${email}, ${data.subject}, 'sent',
                ${JSON.stringify({
                  campaign_key: campaignKey,
                  audience,
                  sentBy: auth.payload?.userId,
                })}::jsonb
              )
              RETURNING id
            `;
            trackingId = String(ins.rows[0]?.id || '');
          }
        } catch (e) {
          console.warn('tracking broadcast:', e);
        }

        const { html, text, subject } = buildWaitlistBroadcastEmail({
          userName: displayName,
          message: data.message,
          subject: data.subject,
          trackingId: trackingId || undefined,
          adminBaseUrl,
        });

        const result = await sendEmail({ from, to: email, subject, html, text });

        if (trackingId) {
          try {
            await sql`
              UPDATE email_tracking
              SET
                status = ${result.success ? 'sent' : 'failed'},
                message_id = ${result.messageId || null},
                updated_at = NOW()
              WHERE id = ${trackingId}::uuid
            `;
          } catch {
            /* ignore */
          }
        }

        if (result.success) sent++;
        results.push({
          email,
          success: result.success,
          error: result.error,
        });
      } catch (err) {
        results.push({
          email,
          success: false,
          error: err instanceof Error ? err.message : 'Error',
        });
      }
    }

    return NextResponse.json({
      success: sent > 0,
      message: `Enviados ${sent} de ${recipients.length} emails (waitlist)`,
      sent,
      total: recipients.length,
      campaign_key: campaignKey,
      results: results.slice(0, 50),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    console.error('waitlist-broadcast POST:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
