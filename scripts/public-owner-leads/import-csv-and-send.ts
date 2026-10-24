#!/usr/bin/env npx tsx
/**
 * One-shot: importa leads.csv → Neon public_owner_leads y envía hasta N mails
 * con tracking (email_tracking + pixel + click wrap) vía SMTP Zoho de prod.
 *
 * Uso (desde delfin-check-in):
 *   set -a && source .env.outreach.local && set +a
 *   export NEXT_PUBLIC_APP_URL=https://admin.delfincheckin.com
 *   export OUTREACH_SIGNUP_URL=https://delfincheckin.com/parte-viajeros/
 *   npx tsx scripts/public-owner-leads/import-csv-and-send.ts --limit 50
 *
 * No pisa el cron del otro agente: solo inserta emails nuevos y envía status new/queued.
 */
import fs from 'fs';
import path from 'path';
import { sql } from '@vercel/postgres';
import { buildColdOutreachEmail } from './lib/template';
import { buildOutreachOptOutUrl } from './lib/optout';
import { sendOutreachMail } from './lib/send-smtp';
import { assertAllowedOutreachUrl } from './lib/blocked-hosts';

const CAMPAIGN = 'public_owner_leads_es';
const EMAIL_TYPE = 'public_owner_outreach';
const HARD_CAP = 50;
const DELAY_MS = 1600;

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

function argValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function appBase(): string {
  return String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
}

function signupUrlWithUtm(): string {
  // Sync con src/lib/public-owner-leads/send-tracked.ts → ancla #empezar (form registro)
  const raw = String(
    process.env.OUTREACH_SIGNUP_URL || 'https://delfincheckin.com/parte-viajeros/#empezar'
  ).trim();
  const withHash = raw.includes('#') ? raw : `${raw.replace(/\/+$/, '')}/#empezar`;
  const [beforeHash, hash = 'empezar'] = withHash.split('#');
  const u = new URL(beforeHash.includes('://') ? beforeHash : `https://${beforeHash}`);
  u.searchParams.set('utm_source', 'email');
  u.searchParams.set('utm_medium', 'outreach');
  u.searchParams.set('utm_campaign', CAMPAIGN);
  u.searchParams.set('utm_content', 'free_trial');
  u.searchParams.set('ref', 'owner_outreach');
  u.hash = hash || 'empezar';
  return u.toString();
}

function wrapClick(trackingId: string, url: string): string {
  return `${appBase()}/api/track/email-click?tid=${encodeURIComponent(trackingId)}&url=${encodeURIComponent(url)}`;
}

type CsvLead = { email: string; domain: string; source_url: string };

function parseCsv(file: string): CsvLead[] {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(',').map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const iEmail = idx('email');
  const iDomain = idx('domain');
  const iSource = idx('source_url');
  const iStatus = idx('status');
  const iOpt = idx('opted_out');
  const out: CsvLead[] = [];
  for (const line of lines.slice(1)) {
    // naive CSV (our file has no quoted commas in critical fields)
    const cols = line.split(',');
    const email = (cols[iEmail] || '').trim().toLowerCase();
    const domain = (cols[iDomain] || '').trim();
    const source_url = (cols[iSource] || '').trim();
    const status = (cols[iStatus] || '').trim();
    const opted = (cols[iOpt] || '').trim().toLowerCase() === 'true';
    if (!email || !email.includes('@')) continue;
    if (opted || status === 'skipped') continue;
    if (email.endsWith('@delfincheckin.com')) continue;
    if (email.includes('example')) continue;
    out.push({ email, domain, source_url });
  }
  return out;
}

async function isSuppressed(email: string): Promise<boolean> {
  try {
    const meta = await sql`SELECT to_regclass('public.email_suppression') AS reg`;
    if (!meta.rows[0]?.reg) return false;
    const r = await sql`
      SELECT 1 FROM email_suppression
      WHERE lower(email) = ${email}
      LIMIT 1
    `;
    return Boolean(r.rows[0]);
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  loadEnvFile('.env.outreach.local');
  loadEnvFile('.env.local');
  process.env.NEXT_PUBLIC_APP_URL =
    process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com';
  process.env.OUTREACH_SIGNUP_URL =
    process.env.OUTREACH_SIGNUP_URL || 'https://delfincheckin.com/parte-viajeros/';

  const argv = process.argv.slice(2);
  const dryRun = hasFlag(argv, '--dry-run');
  const limit = Math.min(
    HARD_CAP,
    Math.max(1, Number(argValue(argv, '--limit') || HARD_CAP) || HARD_CAP)
  );
  const file =
    argValue(argv, '--file') ||
    path.join('scripts/public-owner-leads/data/leads.csv');

  const csvLeads = parseCsv(file);
  console.log(JSON.stringify({ csvLeads: csvLeads.length, limit, dryRun, file }, null, 2));

  const table = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
  if (!table.rows[0]?.reg) {
    throw new Error('Falta tabla public_owner_leads — ejecuta migraciones en Neon');
  }

  let imported = 0;
  for (const lead of csvLeads) {
    try {
      assertAllowedOutreachUrl(lead.source_url || `https://${lead.domain}`);
    } catch {
      continue;
    }
    const ins = await sql`
      INSERT INTO public_owner_leads (email, domain, source_url, status, notes)
      VALUES (
        ${lead.email},
        ${lead.domain},
        ${lead.source_url || `https://${lead.domain}`},
        'queued',
        ${`csv-import:${new Date().toISOString().slice(0, 10)}`}
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    if (ins.rows[0]?.id) imported++;
  }

  const sentToday = await sql`
    SELECT COUNT(*)::int AS n
    FROM public_owner_leads
    WHERE status = 'sent'
      AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
        AT TIME ZONE 'Europe/Madrid'
  `;
  const already = Number(sentToday.rows[0]?.n || 0);
  const budget = Math.max(0, Math.min(limit, HARD_CAP - already));

  const queue = await sql`
    SELECT id, email, domain, source_url
    FROM public_owner_leads
    WHERE NOT opted_out
      AND status IN ('queued', 'new')
    ORDER BY queued_at NULLS LAST, created_at ASC
    LIMIT ${budget}
  `;

  console.log(
    JSON.stringify(
      { imported, sentTodayBefore: already, budget, toSend: queue.rows.length },
      null,
      2
    )
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const signupRaw = signupUrlWithUtm();

  for (const row of queue.rows) {
    const id = String(row.id);
    const email = String(row.email).toLowerCase();
    const domain = String(row.domain || '');
    const sourceUrl = String(row.source_url || '');

    if (await isSuppressed(email)) {
      await sql`
        UPDATE public_owner_leads
        SET status = 'skipped', notes = COALESCE(notes,'') || ' | suppressed', updated_at = NOW()
        WHERE id = ${id}::uuid
      `;
      skipped++;
      continue;
    }

    try {
      assertAllowedOutreachUrl(sourceUrl || `https://${domain}`);
    } catch (e: any) {
      await sql`
        UPDATE public_owner_leads
        SET status = 'skipped', last_error = ${String(e?.message || e).slice(0, 200)}, updated_at = NOW()
        WHERE id = ${id}::uuid
      `;
      skipped++;
      continue;
    }

    let trackingId = '';
    try {
      const meta = await sql`SELECT to_regclass('public.email_tracking') AS reg`;
      if (meta.rows[0]?.reg) {
        // status CHECK no admite 'queued' → insertamos 'sent' y si falla SMTP → 'failed'
        const inserted = await sql`
          INSERT INTO email_tracking (
            tenant_id, email_type, recipient_email, subject, status, metadata
          ) VALUES (
            NULL,
            ${EMAIL_TYPE},
            ${email},
            ${`${domain || 'tu alojamiento'}: parte de viajeros MIR con prueba gratis`},
            'sent',
            ${JSON.stringify({
              campaign: CAMPAIGN,
              lead_id: id,
              source_url: sourceUrl,
              domain,
            })}::jsonb
          )
          RETURNING id
        `;
        trackingId = String(inserted.rows[0]?.id || '');
      }
    } catch (e) {
      console.warn('[track-insert]', e);
    }

    const trackedSignup = trackingId ? wrapClick(trackingId, signupRaw) : signupRaw;
    const optOutUrl = buildOutreachOptOutUrl(email, 'es');
    const mail = buildColdOutreachEmail({
      toEmail: email,
      domain,
      sourceUrl,
      optOutUrl,
      signupUrl: trackedSignup,
    });

    let html = mail.html;
    if (trackingId) {
      const pixel = `${appBase()}/api/track/email-open?tid=${encodeURIComponent(trackingId)}`;
      html = html.replace(
        '</body>',
        `<img src="${pixel}" alt="" width="1" height="1" style="display:none;border:0;" /></body>`
      );
    }

    if (dryRun) {
      console.log(`[dry-run] ${email} | ${mail.subject}`);
      sent++;
      continue;
    }

    try {
      const info = await sendOutreachMail({
        to: email,
        subject: mail.subject,
        text: mail.text.replace(trackedSignup, signupRaw),
        html,
        optOutUrl,
      });

      if (trackingId) {
        await sql`
          UPDATE email_tracking
          SET status = 'sent', message_id = ${info.messageId || null}, updated_at = NOW()
          WHERE id = ${trackingId}::uuid
        `;
      }

      await sql`
        UPDATE public_owner_leads
        SET
          status = 'sent',
          sent_at = NOW(),
          updated_at = NOW(),
          tracking_id = COALESCE(${trackingId || null}::uuid, tracking_id),
          last_error = NULL,
          notes = COALESCE(notes, '') || ${` | sent:${new Date().toISOString().slice(0, 10)}`}
        WHERE id = ${id}::uuid
      `;

      sent++;
      console.log(`[sent] ${email}${trackingId ? ` tid=${trackingId}` : ''}`);
      await sleep(DELAY_MS);
    } catch (e: any) {
      failed++;
      const msg = String(e?.message || e).slice(0, 400);
      console.error(`[fail] ${email}:`, msg);
      if (trackingId) {
        try {
          await sql`
            UPDATE email_tracking SET status = 'failed', updated_at = NOW()
            WHERE id = ${trackingId}::uuid
          `;
        } catch {
          /* ignore */
        }
      }
      await sql`
        UPDATE public_owner_leads
        SET status = 'skipped', last_error = ${msg}, updated_at = NOW(),
            notes = COALESCE(notes,'') || ' | send-fail'
        WHERE id = ${id}::uuid
      `;
    }
  }

  console.log(
    JSON.stringify(
      { ok: true, dryRun, imported, sent, failed, skipped, signup: signupRaw },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
