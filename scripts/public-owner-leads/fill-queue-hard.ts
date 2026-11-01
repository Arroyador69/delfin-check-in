#!/usr/bin/env npx tsx
/**
 * Rellena cola a ≥1000: open data + extract de pending (lotes cortos, anti-timeout Neon).
 *   npx tsx scripts/public-owner-leads/fill-queue-hard.ts
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
if (process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL_NON_POOLING;
}

import { sql } from '../../src/lib/db';
import { PUBLIC_OWNER_LEADS_MIN_QUEUED } from '../../src/lib/public-owner-leads/constants';
import { extractPublicEmailsFromUrl, normalizeUrl } from '../../src/lib/public-owner-leads/extract-web';
import {
  domainFromUrl,
  isPlausiblePublicEmail,
  normalizeEmail,
  scoreEmailForSource,
} from '../../src/lib/public-owner-leads/emails';
import { isBlockedOutreachHost } from '../../src/lib/public-owner-leads/blocked-hosts';
import { hostSuggestsNonVacation } from '../../src/lib/public-owner-leads/spain-vacation-filter';
import { sleep } from '../../src/lib/public-owner-leads/fetch-html';
import { importAllOpenDataToQueue } from '../../src/lib/public-owner-leads/import-opendata';
import { scoreOpenDataEmail } from '../../src/lib/public-owner-leads/discover-opendata-multi';
import {
  ensureSpainAgencySourceQueue,
  ensureSpainVacationSourceQueue,
  recycleEmptySources,
} from '../../src/lib/public-owner-leads/ensure-source-queue';

async function countQueued(): Promise<number> {
  const r = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'queued' AND opted_out = false
  `;
  return Number(r.rows[0]?.n || 0);
}

async function loadUsed(): Promise<{ emails: Set<string>; domains: Set<string> }> {
  const emails = new Set<string>();
  const domains = new Set<string>();
  const r = await sql`
    SELECT lower(email) AS e, lower(regexp_replace(coalesce(domain,''), '^www\\.', '')) AS d
    FROM public_owner_leads
    WHERE status IN ('sent', 'queued', 'new', 'bounced', 'skipped')
  `;
  for (const row of r.rows) {
    if (row.e) emails.add(String(row.e));
    if (row.d) domains.add(String(row.d));
  }
  return { emails, domains };
}

async function extractBatch(
  batchSize: number,
  used: { emails: Set<string>; domains: Set<string> }
): Promise<{ extracted: number; processed: number }> {
  const pending = await sql`
    SELECT id, url FROM public_owner_lead_sources
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT ${batchSize}
  `;
  let extracted = 0;
  let processed = 0;
  for (const row of pending.rows) {
    processed++;
    const url = normalizeUrl(String(row.url || ''));
    if (!url || isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) {
      await sql`
        UPDATE public_owner_lead_sources
        SET status = 'blocked', last_scraped_at = NOW() WHERE id = ${row.id}::uuid
      `;
      continue;
    }
    try {
      const { leads, blocked, error } = await extractPublicEmailsFromUrl(url);
      if (blocked) {
        await sql`
          UPDATE public_owner_lead_sources
          SET status = 'blocked', last_error = ${error || 'blocked'}, last_scraped_at = NOW()
          WHERE id = ${row.id}::uuid
        `;
        continue;
      }
      let found = 0;
      for (const lead of leads) {
        const email = lead.email.toLowerCase();
        const domain = (lead.domain || domainFromUrl(lead.source_url) || '').replace(
          /^www\./,
          ''
        );
        if (!isPlausiblePublicEmail(email) || scoreEmailForSource(email, lead.source_url) < 0) {
          continue;
        }
        if (used.emails.has(email)) continue;
        const note = `fill-hard:extract:${new Date().toISOString().slice(0, 10)}`;
        const ins = await sql`
          INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
          VALUES (${email}, ${domain}, ${lead.source_url}, 'queued', ${note}, NOW())
          ON CONFLICT (email) DO NOTHING
          RETURNING id
        `;
        if (ins.rows[0]) {
          found++;
          extracted++;
          used.emails.add(email);
          if (domain) used.domains.add(domain);
        }
      }
      await sql`
        UPDATE public_owner_lead_sources
        SET status = 'done', emails_found = ${found}, last_scraped_at = NOW(), updated_at = NOW()
        WHERE id = ${row.id}::uuid
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sql`
        UPDATE public_owner_lead_sources
        SET status = 'failed', last_error = ${msg.slice(0, 400)}, last_scraped_at = NOW()
        WHERE id = ${row.id}::uuid
      `;
    }
    await sleep(250);
  }
  return { extracted, processed };
}

/** Importa emails OpenRTA (regex) — el CSV usa | y campos rotos. */
async function importOpenRtaEmails(
  used: { emails: Set<string>; domains: Set<string> },
  limit: number
): Promise<number> {
  const file = '/tmp/openrta.csv';
  if (!fs.existsSync(file)) return 0;
  const raw = fs.readFileSync(file, 'utf8');
  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const urlRe = /https?:\/\/[^\s|"']+/gi;
  const wwwRe = /(?:^|[|\s])((?:www\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s|]*)?)/g;
  const found = new Map<string, string>();
  for (const line of raw.split(/\n/)) {
    const emails = line.match(emailRe) || [];
    if (!emails.length) continue;
    const urls = [...(line.match(urlRe) || [])];
    let m: RegExpExecArray | null;
    wwwRe.lastIndex = 0;
    while ((m = wwwRe.exec(line))) urls.push('https://' + m[1]);
    const web = urls.find((u) => /\.(es|com|net|org|eu)/i.test(u)) || '';
    for (const e of emails) {
      const email = normalizeEmail(e);
      if (!found.has(email)) found.set(email, web);
    }
  }
  let queued = 0;
  for (const [email, web0] of found) {
    if (queued >= limit) break;
    if (!isPlausiblePublicEmail(email) || used.emails.has(email)) continue;
    if (/@(juntadeandalucia|gob)\.es$/i.test(email) || /noreply/i.test(email)) continue;
    let web = web0 || `https://${email.split('@')[1]}`;
    if (!/^https?:/i.test(web)) web = `https://${web}`;
    if (isBlockedOutreachHost(web)) continue;
    let d = (email.split('@')[1] || '').replace(/^www\./, '');
    try {
      d = new URL(web).hostname.replace(/^www\./, '') || d;
    } catch {
      /* keep */
    }
    if (!d || used.domains.has(d)) continue;
    if (scoreOpenDataEmail(email, web) < 0) continue;
    const note = `opendata:openrta:AND:${new Date().toISOString().slice(0, 10)}`;
    const ins = await sql`
      INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
      VALUES (${email}, ${d}, ${web}, 'queued', ${note}, NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    if (ins.rows[0]) {
      queued++;
      used.emails.add(email);
      used.domains.add(d);
    }
  }
  return queued;
}

async function main() {
  const target = PUBLIC_OWNER_LEADS_MIN_QUEUED;
  console.log('[fill-hard] target', target, 'start', await countQueued());

  await ensureSpainVacationSourceQueue();
  await ensureSpainAgencySourceQueue();
  console.log('[fill-hard] recycled', await recycleEmptySources(200, 0));

  let used = await loadUsed();
  console.log('[fill-hard] openrta emails', await importOpenRtaEmails(used, 400));

  try {
    const od = await importAllOpenDataToQueue({
      limitPerSource: 250,
      websiteLimitPerSource: 200,
    });
    console.log('[fill-hard] opendata', od);
  } catch (e) {
    console.warn('[fill-hard] opendata fail', e instanceof Error ? e.message : e);
  }

  for (let round = 0; round < 25; round++) {
    let n = await countQueued();
    console.log(`[fill-hard] round ${round} queued=${n}`);
    if (n >= target) break;

    used = await loadUsed();
    try {
      const batch = await extractBatch(35, used);
      console.log('[fill-hard] extract', batch);
    } catch (e) {
      console.warn('[fill-hard] extract batch fail', e instanceof Error ? e.message : e);
      await sleep(3000);
      continue;
    }

    n = await countQueued();
    if (n >= target) break;

    if (round % 3 === 2) {
      try {
        await recycleEmptySources(80, 0);
        const od = await importAllOpenDataToQueue({
          limitPerSource: 100,
          websiteLimitPerSource: 80,
        });
        console.log('[fill-hard] topup', od.queued, od.sourcesQueued);
      } catch (e) {
        console.warn('[fill-hard] topup fail', e instanceof Error ? e.message : e);
      }
    }
    await sleep(500);
  }

  const pending = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_lead_sources WHERE status = 'pending'
  `;
  console.log(
    JSON.stringify(
      {
        queued_final: await countQueued(),
        pending_sources: pending.rows[0]?.n,
        target,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
