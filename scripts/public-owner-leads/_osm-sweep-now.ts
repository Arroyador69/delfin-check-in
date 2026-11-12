#!/usr/bin/env npx tsx
/**
 * Barrido OSM multi-offset → nuevas webs pending + emails OSM a cola.
 *   npx tsx scripts/public-owner-leads/_osm-sweep-now.ts
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { discoverOwnerSitesByPlace } from '../../src/lib/public-owner-leads/discover-by-place';

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

async function main() {
  const pool = new pg.Pool({
    connectionString:
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });

  let totalWebs = 0;
  let totalEmails = 0;

  for (let offset = 0; offset < 16; offset++) {
    const disc = await discoverOwnerSitesByPlace({
      maxPlaces: 10,
      maxCandidates: 100,
      delayMs: 220,
      deadlineMs: 55_000,
      waveOffset: offset,
    });
    let webs = 0;
    let emails = 0;
    for (const url of disc.candidateUrls) {
      const r = await pool.query(
        `INSERT INTO public_owner_lead_sources (url, status) VALUES ($1,'pending')
         ON CONFLICT (url) DO NOTHING RETURNING id`,
        [url]
      );
      if (r.rowCount) webs++;
    }
    const used = new Set(
      (
        await pool.query<{ e: string }>(
          `SELECT lower(email) AS e FROM public_owner_leads
           WHERE status IN ('sent','queued','new','bounced')`
        )
      ).rows.map((x) => x.e)
    );
    for (const row of disc.emailsFromOsm) {
      const email = String(row.email || '').toLowerCase();
      if (!email || used.has(email)) continue;
      const host = String(row.website || '')
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0]
        .toLowerCase();
      if (!host) continue;
      const ins = await pool.query(
        `INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
         VALUES ($1,$2,$3,'queued',$4,NOW())
         ON CONFLICT (email) DO NOTHING RETURNING id`,
        [email, host, row.website, `osm-sweep:${row.place}`]
      );
      if (ins.rowCount) {
        emails++;
        used.add(email);
      }
    }
    totalWebs += webs;
    totalEmails += emails;
    console.log(
      JSON.stringify({
        offset,
        places: disc.places.length,
        hits: disc.osmHits,
        newWebs: webs,
        newEmails: emails,
        cand: disc.candidateUrls.length,
      })
    );
  }

  const q = (
    await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public_owner_leads
       WHERE status='queued' AND opted_out=false`
    )
  ).rows[0]?.n;
  console.log(JSON.stringify({ totalWebs, totalEmails, queued: q }, null, 2));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
