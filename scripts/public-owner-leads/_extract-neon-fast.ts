#!/usr/bin/env npx tsx
/**
 * Extract concurrente con neon serverless (estable en local).
 *   npx tsx scripts/public-owner-leads/_extract-neon-fast.ts [target=400]
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

import {
  extractPublicEmailsFromUrl,
  normalizeUrl,
} from '../../src/lib/public-owner-leads/extract-web';
import {
  domainFromUrl,
  isPlausiblePublicEmail,
  scoreEmailForSource,
} from '../../src/lib/public-owner-leads/emails';
import { isBlockedOutreachHost } from '../../src/lib/public-owner-leads/blocked-hosts';
import { hostSuggestsNonVacation } from '../../src/lib/public-owner-leads/spain-vacation-filter';

const TARGET = Number(process.argv[2] || 400);
const BATCH = 30;
const CONC = 6;

function db() {
  const url =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    '';
  if (!url) throw new Error('missing DATABASE_URL');
  return neon(url);
}

async function main() {
  const sql = db();
  const used = new Set<string>();
  const already = (await sql`
    SELECT lower(email) AS e FROM public_owner_leads
    WHERE status IN ('sent', 'queued', 'new', 'bounced')
  `) as Array<{ e: string }>;
  for (const row of already) if (row.e) used.add(row.e);

  const q0 = (await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'queued' AND opted_out = false
  `) as Array<{ n: number }>;
  console.log('[neon-fast] start queued', q0[0]?.n, 'used', used.size);

  let inserted = 0;
  let processed = 0;

  for (let round = 0; round < 50; round++) {
    const qNow = (await sql`
      SELECT COUNT(*)::int AS n FROM public_owner_leads
      WHERE status = 'queued' AND opted_out = false
    `) as Array<{ n: number }>;
    const queued = Number(qNow[0]?.n || 0);
    if (queued >= TARGET) {
      console.log('[neon-fast] TARGET', queued);
      break;
    }

    const pending = (await sql`
      SELECT id::text AS id, url FROM public_owner_lead_sources
      WHERE status = 'pending'
        AND url !~* '^https?://([0-9]{1,3}\\.){3}[0-9]{1,3}'
      ORDER BY created_at DESC
      LIMIT ${BATCH}
    `) as Array<{ id: string; url: string }>;

    if (!pending.length) {
      console.log('[neon-fast] no pending hosts');
      break;
    }

    for (let i = 0; i < pending.length; i += CONC) {
      const slice = pending.slice(i, i + CONC);
      await Promise.all(
        slice.map(async (row) => {
          const url = normalizeUrl(String(row.url || ''));
          processed++;
          if (!url || isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) {
            await sql`
              UPDATE public_owner_lead_sources
              SET status = 'blocked', last_error = 'blocked-or-non-vacation',
                  last_scraped_at = NOW(), updated_at = NOW()
              WHERE id = ${row.id}::uuid
            `;
            process.stdout.write('b');
            return;
          }
          try {
            const { leads, blocked, error } = await extractPublicEmailsFromUrl(url);
            if (blocked) {
              await sql`
                UPDATE public_owner_lead_sources
                SET status = 'blocked', last_error = ${error || 'blocked'},
                    last_scraped_at = NOW(), updated_at = NOW()
                WHERE id = ${row.id}::uuid
              `;
              process.stdout.write('B');
              return;
            }
            let found = 0;
            for (const lead of leads) {
              const email = lead.email.toLowerCase();
              const domain = (
                lead.domain ||
                domainFromUrl(lead.source_url) ||
                ''
              ).replace(/^www\./, '');
              if (
                !isPlausiblePublicEmail(email) ||
                scoreEmailForSource(email, lead.source_url) < 0
              ) {
                continue;
              }
              if (used.has(email)) continue;
              const note = `neon-fast:${new Date().toISOString().slice(0, 10)}`;
              const ins = (await sql`
                INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
                VALUES (${email}, ${domain}, ${lead.source_url}, 'queued', ${note}, NOW())
                ON CONFLICT (email) DO NOTHING
                RETURNING id::text AS id
              `) as Array<{ id: string }>;
              if (ins[0]?.id) {
                found++;
                inserted++;
                used.add(email);
              }
            }
            await sql`
              UPDATE public_owner_lead_sources
              SET status = 'done', emails_found = ${found},
                  last_scraped_at = NOW(), updated_at = NOW()
              WHERE id = ${row.id}::uuid
            `;
            process.stdout.write(found ? '+' : '.');
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await sql`
              UPDATE public_owner_lead_sources
              SET status = 'failed', last_error = ${msg.slice(0, 400)},
                  last_scraped_at = NOW(), updated_at = NOW()
              WHERE id = ${row.id}::uuid
            `;
            process.stdout.write('x');
          }
        })
      );
    }

    const qEnd = (await sql`
      SELECT COUNT(*)::int AS n FROM public_owner_leads
      WHERE status = 'queued' AND opted_out = false
    `) as Array<{ n: number }>;
    console.log(
      `\n[neon-fast] round ${round + 1} processed=${processed} inserted=${inserted} queued=${qEnd[0]?.n}`
    );
  }

  const finalQ = (await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'queued' AND opted_out = false
  `) as Array<{ n: number }>;
  console.log(
    JSON.stringify(
      { queued: finalQ[0]?.n, inserted, processed, target: TARGET },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
