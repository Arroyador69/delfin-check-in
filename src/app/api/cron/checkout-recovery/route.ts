import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import { sql } from '@/lib/db';
import { sendOutreachMail } from '@/lib/public-owner-leads/send-smtp';

export const maxDuration = 120;

function appBase(): string {
  return String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
}

/**
 * Recovery: free con Polar intent sin suscripción → 1 email Plan Check-in.
 * GET /api/cron/checkout-recovery?max=15
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const max = Math.min(
    30,
    Math.max(1, parseInt(req.nextUrl.searchParams.get('max') || '15', 10) || 15)
  );
  const base = appBase();

  const abandoned = await sql`
    SELECT id::text AS id, email,
      polar_last_checkout_context->>'source' AS source
    FROM tenants
    WHERE polar_last_upgrade_intent_at IS NOT NULL
      AND plan_type = 'free'
      AND COALESCE(polar_subscription_status, 'none') NOT IN ('active', 'trialing')
      AND email NOT ILIKE '%@delfincheckin.com'
      AND polar_last_upgrade_intent_at >= NOW() - INTERVAL '45 days'
      AND COALESCE(config->>'checkout_recovery_at', '') = ''
    ORDER BY polar_last_upgrade_intent_at DESC
    LIMIT ${max}
  `;

  const results: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (const row of abandoned.rows) {
    const email = String(row.email || '').toLowerCase();
    if (!email.includes('@')) continue;
    const upgradeUrl = `${base}/es/upgrade-plan?plan=checkin&source=checkout_recovery&email=${encodeURIComponent(email)}`;
    const subject = 'Te quedó el Plan Check-in a medias (~2€/mes)';
    const text = [
      'Hola,',
      '',
      'Abriste el pago de Plan Check-in y no lo terminaste.',
      'Con Plan Check-in (~2€/mes) el parte a SES Hospedajes se envía solo.',
      '',
      'Completa aquí (1 minuto):',
      upgradeUrl,
      '',
      'Si no te interesa, ignora este email.',
      '',
      'Equipo Delfín Check-in',
    ].join('\n');
    const html = `<!DOCTYPE html><html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:0;padding:24px;background:#e8f4fc;">
<table width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #cfe5f5;">
<tr><td style="background:#0284c7;padding:20px 24px;color:#fff;font-weight:700;font-size:20px;">Delfín Check-in</td></tr>
<tr><td style="padding:24px;line-height:1.55;font-size:16px;">
<p>Hola,</p>
<p>Abriste el pago de <strong>Plan Check-in</strong> y se quedó a medias. Con ~2€/mes el parte a SES Hospedajes se envía solo.</p>
<p style="text-align:center;margin:28px 0;"><a href="${upgradeUrl.replace(/"/g, '&quot;')}" style="background:#0284c7;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;display:inline-block;">Completar Plan Check-in</a></p>
<p style="font-size:13px;color:#64748b;">Si no te interesa, ignora este email.</p>
</td></tr></table></body></html>`;

    if (dryRun) {
      results.push({ email, ok: true });
      continue;
    }
    try {
      await sendOutreachMail({ to: email, subject, text, html });
      await sql`
        UPDATE tenants
        SET config = COALESCE(config, '{}'::jsonb) || ${JSON.stringify({
          checkout_recovery_at: new Date().toISOString(),
        })}::jsonb,
            updated_at = NOW()
        WHERE id = ${String(row.id)}::uuid
      `;
      results.push({ email, ok: true });
    } catch (e) {
      results.push({
        email,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    success: true,
    dryRun,
    candidates: abandoned.rows.length,
    sent: results.filter((r) => r.ok && !dryRun).length,
    results,
  });
}
