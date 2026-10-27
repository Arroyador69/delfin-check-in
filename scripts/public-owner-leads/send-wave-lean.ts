#!/usr/bin/env npx tsx
/**
 * Oleada ligera: solo envía desde cola (sin OSM/discover).
 * Luego refill a MIN_QUEUED (1000).
 *
 *   npx tsx scripts/public-owner-leads/send-wave-lean.ts --max 300
 */
import fs from 'fs';
import path from 'path';

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

import { sql } from '../../src/lib/db';
import { sendTrackedOutreachLead } from '../../src/lib/public-owner-leads/send-tracked';
import { isEmailSuppressed } from '../../src/lib/email-suppression';
import { isPlausiblePublicEmail, scoreEmailForSource } from '../../src/lib/public-owner-leads/emails';
import { isBlockedOutreachHost } from '../../src/lib/public-owner-leads/blocked-hosts';
import { hostSuggestsNonVacation } from '../../src/lib/public-owner-leads/spain-vacation-filter';
import {
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_MIN_DELAY_MS,
  PUBLIC_OWNER_LEADS_MIN_QUEUED,
} from '../../src/lib/public-owner-leads/constants';
import type { OutreachAudience } from '../../src/lib/public-owner-leads/spain-vacation-filter';

function argNum(name: string, def: number): number {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) {
    const n = Number(process.argv[i + 1]);
    if (Number.isFinite(n)) return n;
  }
  return def;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withDbRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/fetch failed|Connect Timeout|ENOTFOUND|ECONNRESET/i.test(msg)) throw e;
      const wait = 5000 * (i + 1);
      console.warn(`[db-retry] ${i + 1}/${tries} wait ${wait}ms: ${msg.slice(0, 80)}`);
      await sleep(wait);
    }
  }
  throw last;
}

async function countSentToday(): Promise<number> {
  return withDbRetry(async () => {
    const r = await sql`
      SELECT COUNT(*)::int AS n FROM public_owner_leads
      WHERE status = 'sent'
        AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
          AT TIME ZONE 'Europe/Madrid'
    `;
    return Number(r.rows[0]?.n || 0);
  });
}

async function countQueued(): Promise<number> {
  return withDbRetry(async () => {
    const r = await sql`
      SELECT COUNT(*)::int AS n FROM public_owner_leads
      WHERE status = 'queued' AND opted_out = false
    `;
    return Number(r.rows[0]?.n || 0);
  });
}

async function main() {
  const maxWanted = argNum('--max', 300);
  const sentToday = await countSentToday();
  const remaining = Math.max(0, PUBLIC_OWNER_LEADS_DAILY_HARD_CAP - sentToday);
  const budget = Math.min(maxWanted, remaining);
  console.log(JSON.stringify({ sentToday, remaining, budget, cap: PUBLIC_OWNER_LEADS_DAILY_HARD_CAP }));

  if (budget <= 0) {
    console.log('[done] tope diario ya alcanzado');
    return;
  }

  const domainsSent = new Set<string>();
  const emailsSent = new Set<string>();
  await withDbRetry(async () => {
    const already = await sql`
      SELECT DISTINCT lower(domain) AS d FROM public_owner_leads
      WHERE status = 'sent' AND domain IS NOT NULL AND domain <> ''
    `;
    for (const r of already.rows) {
      const d = String(r.d || '').replace(/^www\./i, '');
      if (d) domainsSent.add(d);
    }
    const alreadyEmail = await sql`
      SELECT lower(email) AS e FROM public_owner_leads WHERE status = 'sent'
    `;
    for (const r of alreadyEmail.rows) {
      if (r.e) emailsSent.add(String(r.e));
    }
  });

  const queue = await withDbRetry(async () => {
    return sql`
      SELECT id, email, domain, source_url, notes
      FROM public_owner_leads
      WHERE status = 'queued' AND opted_out = false
      ORDER BY queued_at ASC NULLS LAST, created_at ASC
      LIMIT ${budget * 3}
    `;
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of queue.rows) {
    if (sent >= budget) break;
    const email = String(row.email || '').toLowerCase();
    const domain = String(row.domain || '')
      .toLowerCase()
      .replace(/^www\./i, '');
    const src = String(row.source_url || row.domain || '');

    if (emailsSent.has(email)) {
      skipped++;
      await withDbRetry(async () => {
        await sql`
          UPDATE public_owner_leads SET status = 'skipped', updated_at = NOW(),
            notes = COALESCE(notes, '') || ' | skip:email-already-sent'
          WHERE id = ${row.id}::uuid
        `;
      });
      continue;
    }
    if (domain && domainsSent.has(domain)) {
      skipped++;
      await withDbRetry(async () => {
        await sql`
          UPDATE public_owner_leads SET status = 'skipped', updated_at = NOW(),
            notes = COALESCE(notes, '') || ' | skip:domain-already-sent'
          WHERE id = ${row.id}::uuid
        `;
      });
      continue;
    }
    if (!isPlausiblePublicEmail(email) || scoreEmailForSource(email, src || domain) < 0) {
      skipped++;
      await withDbRetry(async () => {
        await sql`
          UPDATE public_owner_leads SET status = 'bounced', last_error = 'invalid-extract',
            updated_at = NOW(), notes = COALESCE(notes, '') || ' | bounced:pre-send-filter'
          WHERE id = ${row.id}::uuid
        `;
      });
      continue;
    }
    try {
      if (await isEmailSuppressed(email)) {
        skipped++;
        await withDbRetry(async () => {
          await sql`
            UPDATE public_owner_leads SET status = 'skipped', updated_at = NOW(),
              notes = COALESCE(notes, '') || ' | suppressed'
            WHERE id = ${row.id}::uuid
          `;
        });
        continue;
      }
    } catch {
      /* ignore */
    }
    if (isBlockedOutreachHost(src) || hostSuggestsNonVacation(src)) {
      skipped++;
      await withDbRetry(async () => {
        await sql`
          UPDATE public_owner_leads SET status = 'skipped', updated_at = NOW(),
            notes = COALESCE(notes, '') || ' | blocked-non-vacation-es'
          WHERE id = ${row.id}::uuid
        `;
      });
      continue;
    }

    const notes = String(row.notes || '');
    let audience: OutreachAudience = 'owner';
    if (/agency|flow-c|gestora|gesti[oó]n/i.test(notes)) audience = 'agency';
    else if (/hotel|hostal/i.test(notes)) audience = 'hotel';

    const result = await sendTrackedOutreachLead({
      id: String(row.id),
      email,
      domain: String(row.domain || ''),
      source_url: String(row.source_url || ''),
      audience,
    });

    if (result.ok) {
      sent++;
      emailsSent.add(email);
      if (domain) domainsSent.add(domain);
      if (sent % 25 === 0) console.log(`[progress] sent ${sent}/${budget}`);
    } else {
      failed++;
      console.warn(`[fail] ${email}: ${(result.error || '').slice(0, 120)}`);
      if (result.retryable) {
        console.log('[abort] zoho rate-limit — resto queda en cola');
        break;
      }
    }
    await sleep(PUBLIC_OWNER_LEADS_MIN_DELAY_MS);
  }

  console.log(JSON.stringify({ waveSent: sent, failed, skipped }));

  // Refill cola a 1000
  try {
    const { refillQueuedStock } = await import('../../src/lib/public-owner-leads/refill-queue');
    const refill = await withDbRetry(() =>
      refillQueuedStock({
        target: PUBLIC_OWNER_LEADS_MIN_QUEUED,
        extractLimit: 20,
        opendataLimit: 200,
      })
    );
    console.log('[refill]', refill);
  } catch (e) {
    console.warn('[refill fail]', e instanceof Error ? e.message : e);
  }

  const after = {
    sentToday: await countSentToday(),
    queued: await countQueued(),
  };
  console.log('[after]', after);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
