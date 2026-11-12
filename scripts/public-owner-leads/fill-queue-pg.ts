#!/usr/bin/env npx tsx
/**
 * Rellena cola ≥1000 con pg Pool TCP persistente (evita timeout Neon HTTP).
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';

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

const conn =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;
if (!conn) throw new Error('No DB URL');

const pool = new pg.Pool({
  connectionString: conn,
  connectionTimeoutMillis: 60_000,
  idleTimeoutMillis: 120_000,
  max: 3,
  ssl: { rejectUnauthorized: false },
});

async function q<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const r = await pool.query<T>(text, params);
  return r.rows;
}

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
import { scoreOpenDataEmail } from '../../src/lib/public-owner-leads/discover-opendata-multi';

const TARGET = Number(process.argv[2] || 400);

async function countQueued() {
  const rows = await q<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public_owner_leads WHERE status='queued' AND opted_out=false`
  );
  return Number(rows[0]?.n || 0);
}

async function loadUsed() {
  const emails = new Set<string>();
  const domains = new Set<string>();
  const rows = await q<{ e: string; d: string }>(
    `SELECT lower(email) AS e, lower(regexp_replace(coalesce(domain,''), '^www\\.', '')) AS d
     FROM public_owner_leads WHERE status IN ('sent','queued','new','bounced','skipped')`
  );
  for (const row of rows) {
    if (row.e) emails.add(row.e);
    if (row.d) domains.add(row.d);
  }
  return { emails, domains };
}

async function enqueueOpenRtaWebs(limit: number) {
  const file = '/tmp/openrta.csv';
  if (!fs.existsSync(file)) return 0;
  const raw = fs.readFileSync(file, 'utf8');
  const urlRe =
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9.-]+\.(?:es|com|net|org|eu)(?:\/[^\s|"]*)?/gi;
  const seen = new Set<string>();
  let inserted = 0;
  for (const line of raw.split(/\n/)) {
    if (inserted >= limit) break;
    for (let u of line.match(urlRe) || []) {
      if (inserted >= limit) break;
      if (!/^https?:/i.test(u)) u = 'https://' + u;
      const url = normalizeUrl(u);
      if (!url) continue;
      const host = url
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0]
        .toLowerCase();
      if (!host || seen.has(host)) continue;
      if (isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) continue;
      if (/juntadeandalucia|gob\.es|facebook|booking|airbnb|google/i.test(host)) continue;
      seen.add(host);
      const r = await q<{ id: string }>(
        `INSERT INTO public_owner_lead_sources (url, status) VALUES ($1,'pending')
         ON CONFLICT (url) DO NOTHING RETURNING id::text AS id`,
        [url]
      );
      if (r[0]?.id) inserted++;
    }
  }
  return inserted;
}

async function importOpenRtaEmails(used: {
  emails: Set<string>;
  domains: Set<string>;
}) {
  const file = '/tmp/openrta.csv';
  if (!fs.existsSync(file)) return 0;
  const raw = fs.readFileSync(file, 'utf8');
  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const urlRe = /https?:\/\/[^\s|"']+/gi;
  const found = new Map<string, string>();
  for (const line of raw.split(/\n/)) {
    const emails = line.match(emailRe) || [];
    if (!emails.length) continue;
    const urls = line.match(urlRe) || [];
    const web = urls.find((u) => /\.(es|com|net|org)/i.test(u)) || '';
    for (const e of emails) {
      const email = normalizeEmail(e);
      if (!found.has(email)) found.set(email, web);
    }
  }
  let n = 0;
  for (const [email, web0] of found) {
    if (n >= 600) break;
    if (!isPlausiblePublicEmail(email) || used.emails.has(email)) continue;
    if (/@(juntadeandalucia|gob)\.es$/i.test(email)) continue;
    let web = web0 || `https://${email.split('@')[1]}`;
    if (!/^https?:/i.test(web)) web = `https://${web}`;
    if (isBlockedOutreachHost(web)) continue;
    let d = (email.split('@')[1] || '').replace(/^www\./, '');
    try {
      d = new URL(web).hostname.replace(/^www\./, '') || d;
    } catch {
      /* */
    }
    if (!d) continue;
    if (scoreOpenDataEmail(email, web) < 0) continue;
    const note = `opendata:openrta:AND:${new Date().toISOString().slice(0, 10)}`;
    const ins = await q<{ id: string }>(
      `INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
       VALUES ($1,$2,$3,'queued',$4,NOW()) ON CONFLICT (email) DO NOTHING RETURNING id::text AS id`,
      [email, d, web, note]
    );
    if (ins[0]?.id) {
      n++;
      used.emails.add(email);
      used.domains.add(d);
    }
  }
  return n;
}

async function extractBatch(
  used: { emails: Set<string>; domains: Set<string> },
  batch: number
) {
  const pending = await q<{ id: string; url: string }>(
    `SELECT id::text AS id, url FROM public_owner_lead_sources
     WHERE status='pending'
       AND url !~* '^https?://([0-9]{1,3}\\.){3}[0-9]{1,3}'
     ORDER BY created_at DESC LIMIT $1`,
    [batch]
  );
  let extracted = 0;
  let i = 0;
  for (const row of pending) {
    i++;
    const url = normalizeUrl(String(row.url || ''));
    if (!url || isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) {
      await q(`UPDATE public_owner_lead_sources SET status='blocked', last_scraped_at=NOW() WHERE id=$1::uuid`, [
        row.id,
      ]);
      process.stdout.write('b');
      continue;
    }
    try {
      const { leads, blocked, error } = await extractPublicEmailsFromUrl(url);
      if (blocked) {
        await q(
          `UPDATE public_owner_lead_sources SET status='blocked', last_error=$2, last_scraped_at=NOW() WHERE id=$1::uuid`,
          [row.id, error || 'blocked']
        );
        process.stdout.write('B');
        continue;
      }
      let found = 0;
      for (const lead of leads) {
        const email = lead.email.toLowerCase();
        const domain = (lead.domain || domainFromUrl(lead.source_url) || '').replace(
          /^www\./,
          ''
        );
        if (!isPlausiblePublicEmail(email) || scoreEmailForSource(email, lead.source_url) < 0)
          continue;
        // Solo dedupe por email (mismo dominio OK: info@/reservas@ distintos)
        if (used.emails.has(email)) continue;
        const note = `fill-pg:${new Date().toISOString().slice(0, 10)}`;
        const ins = await q<{ id: string }>(
          `INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
           VALUES ($1,$2,$3,'queued',$4,NOW()) ON CONFLICT (email) DO NOTHING RETURNING id::text AS id`,
          [email, domain, lead.source_url, note]
        );
        if (ins[0]?.id) {
          found++;
          extracted++;
          used.emails.add(email);
        }
      }
      await q(
        `UPDATE public_owner_lead_sources SET status='done', emails_found=$2, last_scraped_at=NOW(), updated_at=NOW() WHERE id=$1::uuid`,
        [row.id, found]
      );
      process.stdout.write(found ? '+' : '.');
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 400);
      await q(
        `UPDATE public_owner_lead_sources SET status='failed', last_error=$2, last_scraped_at=NOW() WHERE id=$1::uuid`,
        [row.id, msg]
      );
      process.stdout.write('x');
    }
    if (i % 10 === 0) process.stdout.write(`[${i}/${pending.length}+${extracted}]`);
    await sleep(80);
  }
  process.stdout.write('\n');
  return { processed: pending.length, extracted };
}

async function recycle(limit: number) {
  const r = await q<{ id: string }>(
    `WITH cte AS (
       SELECT id FROM public_owner_lead_sources
       WHERE status IN ('done','failed','blocked') AND COALESCE(emails_found,0)=0
       ORDER BY last_scraped_at ASC NULLS FIRST LIMIT $1
     )
     UPDATE public_owner_lead_sources s
     SET status='pending', last_error=NULL, updated_at=NOW()
     FROM cte WHERE s.id=cte.id RETURNING s.id::text AS id`,
    [limit]
  );
  return r.length;
}

async function main() {
  console.log('[pg-fill] conn', conn.includes('pooler') ? 'pooler' : 'direct');
  console.log('[pg-fill] start', await countQueued());
  let used = await loadUsed();
  console.log('[pg-fill] openrta emails', await importOpenRtaEmails(used));
  console.log('[pg-fill] openrta webs', await enqueueOpenRtaWebs(2000));
  console.log('[pg-fill] recycled', await recycle(300));

  for (let round = 0; round < 80; round++) {
    const n = await countQueued();
    console.log(`[pg-fill] round ${round} queued=${n}`);
    if (n >= TARGET) break;
    used = await loadUsed();
    const batch = await extractBatch(used, 50);
    console.log('[pg-fill] extract', batch);
    if (batch.processed === 0) {
      const rec = await recycle(300);
      console.log('[pg-fill] re-recycle', rec);
      if (rec === 0) {
        console.log('[pg-fill] openrta webs+', await enqueueOpenRtaWebs(1500));
        const pending = await q<{ n: number }>(
          `SELECT COUNT(*)::int AS n FROM public_owner_lead_sources WHERE status='pending'`
        );
        if (Number(pending[0]?.n || 0) === 0) break;
      }
    }
  }

  const pending = await q<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public_owner_lead_sources WHERE status='pending'`
  );
  console.log(
    JSON.stringify(
      { queued_final: await countQueued(), pending: pending[0]?.n, target: TARGET },
      null,
      2
    )
  );
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await pool.end();
  } catch {
    /* */
  }
  process.exit(1);
});
