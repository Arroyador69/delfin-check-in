#!/usr/bin/env npx tsx
/**
 * Refill cold via pg TCP + opendata/OSM/extract (sin dominio-dedupe).
 *   npx tsx scripts/public-owner-leads/_refill-pg-full.ts [target=400]
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
if (process.env.DATABASE_URL) process.env.POSTGRES_URL = process.env.DATABASE_URL;

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
  max: 2,
  ssl: { rejectUnauthorized: false },
});

async function q<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const r = await pool.query<T>(text, params);
  return r.rows;
}

const TARGET = Number(process.argv[2] || 400);

async function countQueued() {
  const rows = await q<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public_owner_leads WHERE status='queued' AND opted_out=false`
  );
  return Number(rows[0]?.n || 0);
}

async function main() {
  console.log('[refill-pg] start queued', await countQueued(), 'target', TARGET);

  // 1) Open data emails → cola
  try {
    const { importAllOpenDataToQueue } = await import(
      '../../src/lib/public-owner-leads/import-opendata'
    );
    const od = await importAllOpenDataToQueue({
      limitPerSource: 120,
      websiteLimitPerSource: 180,
    });
    console.log('[refill-pg] opendata', {
      queued: od.queued,
      sourcesQueued: od.sourcesQueued,
      results: od.results?.slice?.(0, 8) || od.results,
    });
  } catch (e) {
    console.warn('[refill-pg] opendata fail', e instanceof Error ? e.message : e);
  }
  console.log('[refill-pg] after opendata queued', await countQueued());
  if ((await countQueued()) >= TARGET) {
    console.log(JSON.stringify({ queued_final: await countQueued(), target: TARGET }, null, 2));
    await pool.end();
    return;
  }

  // 2) OSM soft
  try {
    const { discoverOwnerSitesByPlace } = await import(
      '../../src/lib/public-owner-leads/discover-by-place'
    );
    const disc = await discoverOwnerSitesByPlace({
      maxPlaces: 12,
      maxCandidates: 80,
      delayMs: 250,
      deadlineMs: 90_000,
      waveOffset: Math.floor(Date.now() / 60_000) % 8,
    });
    let webs = 0;
    for (const url of disc.candidateUrls) {
      const r = await q<{ id: string }>(
        `INSERT INTO public_owner_lead_sources (url, status) VALUES ($1,'pending')
         ON CONFLICT (url) DO NOTHING RETURNING id::text AS id`,
        [url]
      );
      if (r[0]?.id) webs++;
    }
    const used = new Set(
      (
        await q<{ e: string }>(
          `SELECT lower(email) AS e FROM public_owner_leads
           WHERE status IN ('sent','queued','new','bounced')`
        )
      ).map((r) => r.e)
    );
    let osmEmails = 0;
    for (const row of disc.emailsFromOsm) {
      const email = String(row.email || '').toLowerCase();
      if (!email || used.has(email)) continue;
      const host = String(row.website || '')
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0]
        .toLowerCase();
      if (!host) continue;
      const ins = await q<{ id: string }>(
        `INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
         VALUES ($1,$2,$3,'queued',$4,NOW()) ON CONFLICT (email) DO NOTHING RETURNING id::text AS id`,
        [email, host, row.website, `refill-osm:${row.place}`]
      );
      if (ins[0]?.id) {
        osmEmails++;
        used.add(email);
      }
    }
    console.log('[refill-pg] osm', {
      places: disc.places.length,
      webs,
      emails: osmEmails,
      rawEmails: disc.emailsFromOsm.length,
    });
  } catch (e) {
    console.warn('[refill-pg] osm fail', e instanceof Error ? e.message : e);
  }
  console.log('[refill-pg] after osm queued', await countQueued());

  // 3) Recycle rich + extract
  const rich = await q<{ id: string }>(
    `WITH cte AS (
       SELECT id FROM public_owner_lead_sources
       WHERE status='done' AND COALESCE(emails_found,0)>0
       ORDER BY last_scraped_at ASC NULLS FIRST LIMIT 120
     )
     UPDATE public_owner_lead_sources s
     SET status='pending', last_error=NULL, updated_at=NOW()
     FROM cte WHERE s.id=cte.id RETURNING s.id::text AS id`
  );
  console.log('[refill-pg] recycleRich', rich.length);

  const { extractPublicEmailsFromUrl, normalizeUrl } = await import(
    '../../src/lib/public-owner-leads/extract-web'
  );
  const {
    domainFromUrl,
    isPlausiblePublicEmail,
    scoreEmailForSource,
  } = await import('../../src/lib/public-owner-leads/emails');
  const { isBlockedOutreachHost } = await import(
    '../../src/lib/public-owner-leads/blocked-hosts'
  );
  const { hostSuggestsNonVacation } = await import(
    '../../src/lib/public-owner-leads/spain-vacation-filter'
  );

  const usedEmail = new Set(
    (
      await q<{ e: string }>(
        `SELECT lower(email) AS e FROM public_owner_leads
         WHERE status IN ('sent','queued','new','bounced')`
      )
    ).map((r) => r.e)
  );

  let extracted = 0;
  for (let round = 0; round < 30; round++) {
    const n = await countQueued();
    if (n >= TARGET) break;
    const pending = await q<{ id: string; url: string }>(
      `SELECT id::text AS id, url FROM public_owner_lead_sources
       WHERE status='pending'
         AND url !~* '^https?://([0-9]{1,3}\\.){3}[0-9]{1,3}'
       ORDER BY created_at DESC LIMIT 40`
    );
    if (!pending.length) break;
    console.log(`[refill-pg] extract round ${round} pending=${pending.length} queued=${n}`);
    for (const row of pending) {
      if ((await countQueued()) >= TARGET) break;
      const url = normalizeUrl(String(row.url || ''));
      if (!url || isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) {
        await q(
          `UPDATE public_owner_lead_sources SET status='blocked', last_scraped_at=NOW() WHERE id=$1::uuid`,
          [row.id]
        );
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
          if (usedEmail.has(email)) continue;
          const note = `refill-pg:${new Date().toISOString().slice(0, 10)}`;
          const ins = await q<{ id: string }>(
            `INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
             VALUES ($1,$2,$3,'queued',$4,NOW()) ON CONFLICT (email) DO NOTHING RETURNING id::text AS id`,
            [email, domain, lead.source_url, note]
          );
          if (ins[0]?.id) {
            found++;
            extracted++;
            usedEmail.add(email);
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
    }
    process.stdout.write(`\n[refill-pg] extracted_total=${extracted} queued=${await countQueued()}\n`);
  }

  console.log(
    JSON.stringify(
      { queued_final: await countQueued(), extracted, target: TARGET },
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
