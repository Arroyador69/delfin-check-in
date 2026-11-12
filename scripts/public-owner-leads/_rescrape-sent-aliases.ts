#!/usr/bin/env npx tsx
/**
 * Rescrapea source_url de leads ya enviados → aliases (info@/reservas@) nuevos a cola.
 *   npx tsx scripts/public-owner-leads/_rescrape-sent-aliases.ts [target=400] [limitUrls=200]
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

import { extractPublicEmailsFromUrl, normalizeUrl } from '../../src/lib/public-owner-leads/extract-web';
import {
  domainFromUrl,
  isPlausiblePublicEmail,
  scoreEmailForSource,
} from '../../src/lib/public-owner-leads/emails';
import { isBlockedOutreachHost } from '../../src/lib/public-owner-leads/blocked-hosts';
import { hostSuggestsNonVacation } from '../../src/lib/public-owner-leads/spain-vacation-filter';

const TARGET = Number(process.argv[2] || 400);
const LIMIT_URLS = Number(process.argv[3] || 250);

async function main() {
  const conn =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL!;
  const pool = new pg.Pool({
    connectionString: conn,
    connectionTimeoutMillis: 60_000,
    max: 2,
    ssl: { rejectUnauthorized: false },
  });
  const q = async <T extends pg.QueryResultRow>(text: string, params: unknown[] = []) =>
    (await pool.query<T>(text, params)).rows;

  const used = new Set(
    (
      await q<{ e: string }>(
        `SELECT lower(email) AS e FROM public_owner_leads
         WHERE status IN ('sent','queued','new','bounced','skipped')`
      )
    ).map((r) => r.e)
  );
  console.log('[aliases] used', used.size, 'target', TARGET);

  const urls = await q<{ url: string; n: number }>(
    `SELECT source_url AS url, COUNT(*)::int AS n
     FROM public_owner_leads
     WHERE status='sent'
       AND source_url IS NOT NULL
       AND source_url ~* '^https?://'
       AND source_url !~* '^https?://([0-9]{1,3}\\.){3}[0-9]{1,3}'
     GROUP BY 1
     ORDER BY MAX(sent_at) DESC NULLS LAST
     LIMIT $1`,
    [LIMIT_URLS]
  );
  console.log('[aliases] urls', urls.length);

  let inserted = 0;
  let processed = 0;
  for (const row of urls) {
    const queued = Number(
      (
        await q<{ n: number }>(
          `SELECT COUNT(*)::int AS n FROM public_owner_leads
           WHERE status='queued' AND opted_out=false`
        )
      )[0]?.n || 0
    );
    if (queued >= TARGET) break;

    const url = normalizeUrl(row.url);
    processed++;
    if (!url || isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) {
      process.stdout.write('b');
      continue;
    }
    try {
      const { leads, blocked } = await extractPublicEmailsFromUrl(url);
      if (blocked) {
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
        if (used.has(email)) continue;
        const note = `alias-rescrape:${new Date().toISOString().slice(0, 10)}`;
        const ins = await q<{ id: string }>(
          `INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
           VALUES ($1,$2,$3,'queued',$4,NOW())
           ON CONFLICT (email) DO NOTHING RETURNING id::text AS id`,
          [email, domain, lead.source_url || url, note]
        );
        if (ins[0]?.id) {
          found++;
          inserted++;
          used.add(email);
        }
      }
      process.stdout.write(found ? '+' : '.');
    } catch {
      process.stdout.write('x');
    }
    if (processed % 20 === 0) {
      process.stdout.write(`[${processed}/${urls.length}+${inserted}q${queued}]`);
    }
  }

  const finalQ = await q<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public_owner_leads
     WHERE status='queued' AND opted_out=false`
  );
  console.log(
    '\n' +
      JSON.stringify(
        { queued: finalQ[0]?.n, inserted, processed, target: TARGET },
        null,
        2
      )
  );
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
