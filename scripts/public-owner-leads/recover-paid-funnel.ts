#!/usr/bin/env npx tsx
/**
 * Recovery embudo pago (Check-in):
 * 1) Email a free con Polar checkout abandonado (intent sin suscripción).
 * 2) Sync + cola lifecycle (onboarding incompleto / upgrade).
 *
 * Uso:
 *   npx tsx scripts/public-owner-leads/recover-paid-funnel.ts --dry-run
 *   npx tsx scripts/public-owner-leads/recover-paid-funnel.ts --send --max-lifecycle=80
 */
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

function loadEnvFile(name: string): void {
  const p = path.join(process.cwd(), name);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const eq = t.indexOf('=');
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnvFile('.env.outreach.local');
loadEnvFile('.env.local');

// @vercel/postgres exige pooled; en .env.local POSTGRES_URL a veces es directo.
if (process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!dbUrl) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}
const sql = neon(dbUrl);

const APP = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
  /\/+$/,
  ''
);

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}
function argNum(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`${name}=`));
  if (!raw) return fallback;
  const n = Number(raw.split('=')[1]);
  return Number.isFinite(n) ? n : fallback;
}

function buildRecovery(email: string, source: string | null): {
  subject: string;
  text: string;
  html: string;
} {
  const upgradeUrl = `${APP}/es/upgrade-plan?plan=checkin&source=checkout_recovery&email=${encodeURIComponent(email)}`;
  const subject = 'Te quedó el Plan Check-in a medias (~2€/mes)';
  const text = [
    'Hola,',
    '',
    'Vimos que abriste el pago de Plan Check-in en Delfín Check-in y no lo terminaste.',
    'Con Plan Check-in (~2€/mes) el parte de viajeros a SES Hospedajes se envía solo.',
    '',
    'Completa el pago aquí (1 minuto):',
    upgradeUrl,
    '',
    source ? `(Entraste desde: ${source})` : '',
    '',
    'Si no te interesa, ignora este email.',
    '',
    'Un saludo,',
    'Equipo Delfín Check-in',
    'https://delfincheckin.com',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<!DOCTYPE html><html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#e8f4fc;margin:0;padding:24px;">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #cfe5f5;">
    <tr><td style="background:#0284c7;padding:20px 24px;color:#fff;font-size:20px;font-weight:700;">Delfín Check-in</td></tr>
    <tr><td style="padding:24px;font-size:16px;line-height:1.55;">
      <p style="margin:0 0 14px;">Hola,</p>
      <p style="margin:0 0 14px;">Abriste el pago de <strong>Plan Check-in</strong> y se quedó a medias. Con ~2€/mes el parte a SES Hospedajes se envía solo.</p>
      <p style="margin:24px 0;text-align:center;">
        <a href="${upgradeUrl.replace(/"/g, '&quot;')}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;">Completar Plan Check-in</a>
      </p>
      <p style="margin:0;font-size:13px;color:#64748b;">Si no te interesa, ignora este email.</p>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}

async function main() {
  const { sendOutreachMail } = await import('../../src/lib/public-owner-leads/send-smtp');
  const { processLifecycleEmailQueue } = await import('../../src/lib/email-sequences/engine');

  const dryRun = argFlag('--dry-run') || !argFlag('--send');
  const maxLifecycle = argNum('--max-lifecycle', 60);
  const maxRecovery = argNum('--max-recovery', 20);

  const abandoned = await sql`
    SELECT id::text AS id, email, onboarding_status,
      polar_last_checkout_context->>'source' AS source,
      polar_last_upgrade_intent_at,
      COALESCE(config->>'checkout_recovery_at', '') AS recovered
    FROM tenants
    WHERE polar_last_upgrade_intent_at IS NOT NULL
      AND plan_type = 'free'
      AND COALESCE(polar_subscription_status, 'none') NOT IN ('active', 'trialing')
      AND email NOT ILIKE '%@delfincheckin.com'
      AND polar_last_upgrade_intent_at >= NOW() - INTERVAL '45 days'
      AND COALESCE(config->>'checkout_recovery_at', '') = ''
    ORDER BY polar_last_upgrade_intent_at DESC
    LIMIT ${maxRecovery}
  `;

  console.log(
    JSON.stringify(
      {
        dryRun,
        abandoned_candidates: abandoned.length,
        emails: abandoned.map((r) => ({
          email: r.email,
          source: r.source,
          at: r.polar_last_upgrade_intent_at,
        })),
      },
      null,
      2
    )
  );

  let recoverySent = 0;
  let recoveryFail = 0;
  for (const row of abandoned) {
    const email = String(row.email || '').toLowerCase();
    if (!email.includes('@')) continue;
    const mail = buildRecovery(email, row.source == null ? null : String(row.source));
    if (dryRun) {
      console.log(`[dry-run] recovery → ${email} · ${mail.subject}`);
      continue;
    }
    try {
      await sendOutreachMail({
        to: email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      await sql`
        UPDATE tenants
        SET config = COALESCE(config, '{}'::jsonb) || ${JSON.stringify({
          checkout_recovery_at: new Date().toISOString(),
        })}::jsonb,
            updated_at = NOW()
        WHERE id = ${String(row.id)}::uuid
      `;
      recoverySent++;
      console.log(`[sent] recovery → ${email}`);
    } catch (e) {
      recoveryFail++;
      console.error(`[fail] ${email}`, e instanceof Error ? e.message : e);
    }
  }

  const lifecycle = await processLifecycleEmailQueue({
    dryRun,
    maxSends: maxLifecycle,
  });

  console.log(JSON.stringify({ recoverySent, recoveryFail, lifecycle }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
