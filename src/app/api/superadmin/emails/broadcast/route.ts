import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import {
  buildPlatformBroadcastEmailHtml,
  buildPlatformBroadcastPlainText,
} from '@/lib/platform-broadcast-email';

const broadcastSchema = z.object({
  subject: z.string().min(3).max(200),
  heroTitle: z.string().min(2).max(120),
  heroSubtitle: z.string().max(200).optional(),
  body: z.string().min(10).max(12000),
  ctaLabel: z.string().max(80).optional(),
  ctaUrl: z.string().url().optional().or(z.literal('')),
  footerNote: z.string().max(500).optional(),
  emailType: z
    .enum(['onboarding', 'legal_notice', 'upsell', 'incident', 'custom'])
    .optional()
    .default('custom'),
  recipientMode: z.enum([
    'tenant_ids',
    'all_active',
    'onboarding_pending',
    'onboarding_incomplete',
  ]),
  tenantIds: z.array(z.string().uuid()).optional(),
});

type TenantRecipient = { id: string; email: string; name: string };

async function resolveRecipients(
  mode: z.infer<typeof broadcastSchema>['recipientMode'],
  tenantIds?: string[]
): Promise<TenantRecipient[]> {
  if (mode === 'tenant_ids') {
    if (!tenantIds?.length) {
      return [];
    }
    const r = await sql`
      SELECT id::text AS id, email, name
      FROM tenants
      WHERE id = ANY(${tenantIds}::uuid[])
        AND email IS NOT NULL
        AND TRIM(email) <> ''
      ORDER BY created_at DESC
    `;
    return r.rows as TenantRecipient[];
  }

  if (mode === 'all_active') {
    const r = await sql`
      SELECT id::text AS id, email, name
      FROM tenants
      WHERE status = 'active'
        AND email IS NOT NULL
        AND TRIM(email) <> ''
      ORDER BY created_at DESC
    `;
    return r.rows as TenantRecipient[];
  }

  if (mode === 'onboarding_pending') {
    const r = await sql`
      SELECT id::text AS id, email, name
      FROM tenants
      WHERE status = 'active'
        AND (onboarding_status IS NULL OR onboarding_status = 'pending')
        AND email IS NOT NULL
        AND TRIM(email) <> ''
      ORDER BY created_at DESC
    `;
    return r.rows as TenantRecipient[];
  }

  // onboarding_incomplete: pending, in_progress, null — no completed
  const r = await sql`
    SELECT id::text AS id, email, name
    FROM tenants
    WHERE status = 'active'
      AND (onboarding_status IS NULL OR onboarding_status <> 'completed')
      AND email IS NOT NULL
      AND TRIM(email) <> ''
    ORDER BY created_at DESC
  `;
  return r.rows as TenantRecipient[];
}

function dedupeByEmail(recipients: TenantRecipient[]): TenantRecipient[] {
  const seen = new Set<string>();
  const out: TenantRecipient[] = [];
  for (const t of recipients) {
    const key = t.email.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POST /api/superadmin/emails/broadcast
 * Envío masivo con plantilla Delfín a tenants seleccionados o por filtro.
 */
export async function POST(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    if (!payload || !isEffectiveSuperAdminPayload(payload)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const raw = await req.json();
    const data = broadcastSchema.parse(raw);

    if (data.recipientMode === 'tenant_ids' && (!data.tenantIds || data.tenantIds.length === 0)) {
      return NextResponse.json(
        { error: 'Selecciona al menos un tenant o usa un filtro de audiencia.' },
        { status: 400 }
      );
    }

    const recipients = dedupeByEmail(
      await resolveRecipients(data.recipientMode, data.tenantIds)
    );

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No hay destinatarios para el criterio seleccionado.' },
        { status: 400 }
      );
    }

    const ctaUrl = data.ctaUrl?.trim() || undefined;
    const ctaLabel = data.ctaLabel?.trim() || undefined;

    const html = buildPlatformBroadcastEmailHtml({
      subject: data.subject,
      heroTitle: data.heroTitle,
      heroSubtitle: data.heroSubtitle,
      body: data.body,
      ctaLabel: ctaLabel && ctaUrl ? ctaLabel : undefined,
      ctaUrl: ctaLabel && ctaUrl ? ctaUrl : undefined,
      footerNote: data.footerNote,
    });

    const text = buildPlatformBroadcastPlainText({
      subject: data.subject,
      heroTitle: data.heroTitle,
      heroSubtitle: data.heroSubtitle,
      body: data.body,
      ctaLabel: ctaLabel && ctaUrl ? ctaLabel : undefined,
      ctaUrl: ctaLabel && ctaUrl ? ctaUrl : undefined,
      footerNote: data.footerNote,
    });

    const from =
      process.env.SMTP_FROM_ONBOARDING ||
      process.env.ZOHO_FROM_EMAIL ||
      process.env.SMTP_FROM_EMAIL ||
      'noreply@delfincheckin.com';

    const results: Array<{
      tenantId: string;
      email: string;
      name: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < recipients.length; i++) {
      const t = recipients[i];
      try {
        const emailResult = await sendEmail({
          from,
          to: t.email,
          subject: data.subject,
          html,
          text,
        });

        if (emailResult.success) {
          try {
            await sql`
              INSERT INTO email_tracking (
                tenant_id, email_type, recipient_email, subject,
                message_id, status, metadata
              )
              VALUES (
                ${t.id}::uuid,
                ${data.emailType},
                ${t.email},
                ${data.subject},
                ${emailResult.messageId || null},
                'sent',
                ${JSON.stringify({
                  sentBy: 'superadmin_broadcast',
                  userId: payload.userId,
                  recipientMode: data.recipientMode,
                })}
              )
            `;
          } catch (trackErr) {
            console.warn('⚠️ broadcast tracking insert failed:', trackErr);
          }
        }

        results.push({
          tenantId: t.id,
          email: t.email,
          name: t.name,
          success: emailResult.success,
          messageId: emailResult.messageId,
          error: emailResult.error,
        });
      } catch (err) {
        results.push({
          tenantId: t.id,
          email: t.email,
          name: t.name,
          success: false,
          error: err instanceof Error ? err.message : 'Error desconocido',
        });
      }

      // Pequeña pausa entre envíos para no saturar SMTP
      if (i < recipients.length - 1) {
        await sleep(250);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      success: failed.length === 0,
      message: `Enviados ${successCount} de ${recipients.length} emails`,
      total: recipients.length,
      successCount,
      failedCount: failed.length,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    console.error('❌ Error en broadcast:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * GET — vista previa HTML (mismos campos que POST en query no; usamos POST body en cliente).
 * Devuelve conteo de destinatarios por modo (para la UI).
 */
export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    if (!payload || !isEffectiveSuperAdminPayload(payload)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const mode = req.nextUrl.searchParams.get('mode') as
      | 'all_active'
      | 'onboarding_pending'
      | 'onboarding_incomplete'
      | null;

    const counts: Record<string, number> = {};
    for (const m of [
      'all_active',
      'onboarding_pending',
      'onboarding_incomplete',
    ] as const) {
      counts[m] = dedupeByEmail(await resolveRecipients(m)).length;
    }

    if (mode && counts[mode] !== undefined) {
      return NextResponse.json({ mode, count: counts[mode] });
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('❌ Error counts broadcast:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
