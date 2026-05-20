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
const MAX_CHUNK_SIZE = 10;

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
  /** Envío por lotes: offset del destinatario (0 en el primer lote). */
  chunkOffset: z.number().int().min(0).optional(),
  /** Cuántos emails por petición (1–10). Por defecto 3. */
  chunkSize: z.number().int().min(1).max(MAX_CHUNK_SIZE).optional(),
  /** Obligatorio desde el segundo lote. */
  campaignKey: z.string().min(1).optional(),
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

async function sendToRecipient(params: {
  email: string;
  name: string | null;
  subject: string;
  message: string;
  campaignKey: string;
  audience: string;
  sentBy?: string;
  from: string;
  adminBaseUrl: string;
}): Promise<{ email: string; success: boolean; error?: string }> {
  const email = normalizeEmail(params.email);
  const displayName = (params.name || email.split('@')[0] || 'amigo/a').trim();

  try {
    let trackingId: string | null = null;
    try {
      const meta = await sql`SELECT to_regclass('public.email_tracking') as reg`;
      if (meta.rows[0]?.reg) {
        const ins = await sql`
          INSERT INTO email_tracking (
            tenant_id, email_type, recipient_email, subject, status, metadata
          ) VALUES (
            NULL, 'waitlist_broadcast', ${email}, ${params.subject}, 'sent',
            ${JSON.stringify({
              campaign_key: params.campaignKey,
              audience: params.audience,
              sentBy: params.sentBy,
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
      message: params.message,
      subject: params.subject,
      trackingId: trackingId || undefined,
      adminBaseUrl: params.adminBaseUrl,
    });

    const result = await sendEmail({ from: params.from, to: email, subject, html, text });

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

    return {
      email,
      success: result.success,
      error: result.error,
    };
  } catch (err) {
    return {
      email,
      success: false,
      error: err instanceof Error ? err.message : 'Error',
    };
  }
}

/**
 * GET — waitlist + campañas recientes.
 * ?campaign_key=X — detalle por destinatario (abierto, fecha, etc.).
 */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformOwner(req);
  if ('error' in auth && auth.error) return auth.error;

  const sessionEmail = normalizeEmail(String(auth.payload?.email || ''));
  const campaignKeyParam = req.nextUrl.searchParams.get('campaign_key');

  const stats = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE activated_at IS NULL)::int AS pending,
      COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::int AS activated
    FROM waitlist
  `;
  const s = stats.rows[0] as { total: number; pending: number; activated: number };

  try {
    const meta = await sql`SELECT to_regclass('public.email_tracking') as reg`;
    if (!meta.rows[0]?.reg) {
      return NextResponse.json({
        success: true,
        stats: s,
        defaultTestEmail: sessionEmail,
        allowedTestEmails: getPlatformOwnerEmails(),
        recentCampaigns: [],
      });
    }

    if (campaignKeyParam) {
      const rows = await sql`
        SELECT
          et.id,
          et.recipient_email,
          et.subject,
          et.status,
          et.created_at AS sent_at,
          et.opened_at,
          et.opened_count,
          w.name AS waitlist_name
        FROM email_tracking et
        LEFT JOIN waitlist w ON LOWER(TRIM(w.email)) = LOWER(TRIM(et.recipient_email))
        WHERE et.email_type = 'waitlist_broadcast'
          AND et.metadata->>'campaign_key' = ${campaignKeyParam}
          AND COALESCE((et.metadata->>'test')::boolean, false) = false
        ORDER BY et.created_at ASC
      `;

      const detail = (
        rows.rows as Array<{
          id: string;
          recipient_email: string;
          subject: string;
          status: string;
          sent_at: string;
          opened_at: string | null;
          opened_count: number;
          waitlist_name: string | null;
        }>
      ).map((r) => ({
        id: r.id,
        email: r.recipient_email,
        name: r.waitlist_name,
        subject: r.subject,
        status: r.status,
        sent_at: r.sent_at,
        opened: !!r.opened_at || (r.opened_count ?? 0) > 0,
        opened_at: r.opened_at,
      }));

      const openedEmails = detail.filter((d) => d.opened).map((d) => d.email);

      return NextResponse.json({
        success: true,
        campaign_key: campaignKeyParam,
        detail,
        opened_emails: openedEmails,
        stats: {
          sent_count: detail.length,
          opened_count: openedEmails.length,
        },
      });
    }

    const camps = await sql`
      SELECT
        metadata->>'campaign_key' AS campaign_key,
        MAX(subject) AS subject,
        MIN(created_at) AS first_sent_at,
        COUNT(*)::int AS sent_count,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL OR opened_count > 0)::int AS opened_count
      FROM email_tracking
      WHERE email_type = 'waitlist_broadcast'
        AND metadata->>'campaign_key' IS NOT NULL
        AND COALESCE((metadata->>'test')::boolean, false) = false
      GROUP BY metadata->>'campaign_key'
      ORDER BY MAX(created_at) DESC
      LIMIT 20
    `;

    return NextResponse.json({
      success: true,
      stats: s,
      defaultTestEmail: sessionEmail,
      allowedTestEmails: getPlatformOwnerEmails(),
      recentCampaigns: camps.rows,
    });
  } catch (e) {
    console.warn('waitlist-broadcast GET:', e);
    return NextResponse.json({
      success: true,
      stats: s,
      defaultTestEmail: sessionEmail,
      allowedTestEmails: getPlatformOwnerEmails(),
      recentCampaigns: [],
    });
  }
}

/**
 * POST — prueba a tu email o envío a la waitlist (por lotes con progreso).
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

    const from =
      process.env.SMTP_FROM_ONBOARDING ||
      process.env.ZOHO_FROM_EMAIL ||
      process.env.SMTP_FROM_EMAIL ||
      'Delfín Check-in <noreply@delfincheckin.com>';

    if (data.mode === 'test') {
      const campaignKey = getCampaignKey();
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

      const testGreetingName = (() => {
        const local = sessionEmail.split('@')[0] || '';
        const cleaned = local.replace(/[._+-]/g, ' ').trim();
        if (!cleaned) return '';
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      })();

      const { html, text, subject } = buildWaitlistBroadcastEmail({
        userName: testGreetingName,
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
    const chunkOffset = data.chunkOffset ?? 0;
    const chunkSize = Math.min(data.chunkSize ?? 3, MAX_CHUNK_SIZE);

    if (chunkOffset > 0 && !data.campaignKey) {
      return NextResponse.json(
        { error: 'Falta campaignKey para continuar el envío por lotes' },
        { status: 400 }
      );
    }

    const campaignKey = data.campaignKey || getCampaignKey();
    const recipients = await resolveRecipients(audience, data.emails);
    const total = recipients.length;

    if (total === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay destinatarios para esta audiencia',
        sent: 0,
        total: 0,
        processed: 0,
        done: true,
        campaign_key: campaignKey,
      });
    }

    if (chunkOffset >= total) {
      return NextResponse.json({
        success: true,
        message: 'Envío ya completado',
        sent: 0,
        total,
        processed: total,
        done: true,
        campaign_key: campaignKey,
      });
    }

    const slice = recipients.slice(chunkOffset, chunkOffset + chunkSize);
    const results: Array<{ email: string; success: boolean; error?: string }> = [];
    let sent = 0;

    for (const r of slice) {
      const one = await sendToRecipient({
        email: r.email,
        name: r.name,
        subject: data.subject,
        message: data.message,
        campaignKey,
        audience,
        sentBy: auth.payload?.userId,
        from,
        adminBaseUrl,
      });
      results.push(one);
      if (one.success) sent++;
    }

    const processed = chunkOffset + slice.length;
    const done = processed >= total;

    return NextResponse.json({
      success: sent > 0 || done,
      message: done
        ? `Enviados ${processed} de ${total} emails (waitlist)`
        : `Lote enviado: ${processed} de ${total}`,
      sent,
      total,
      processed,
      done,
      campaign_key: campaignKey,
      chunk_offset: chunkOffset,
      results,
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
