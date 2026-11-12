#!/usr/bin/env npx tsx
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { normalizeUrl } from '../../src/lib/public-owner-leads/extract-web';
import { isBlockedOutreachHost } from '../../src/lib/public-owner-leads/blocked-hosts';
import { hostSuggestsNonVacation } from '../../src/lib/public-owner-leads/spain-vacation-filter';

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
  const conn =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL!;
  const pool = new pg.Pool({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const rows = (
    await pool.query<{ url: string }>(
      `SELECT url FROM public_owner_lead_sources
       WHERE status='pending'
         AND url !~* '^https?://([0-9]{1,3}\\.){3}[0-9]{1,3}'
       ORDER BY created_at DESC LIMIT 80`
    )
  ).rows;

  let ok = 0;
  let blocked = 0;
  let nonVac = 0;
  const samples: string[] = [];
  for (const r of rows) {
    const url = normalizeUrl(r.url);
    if (!url) continue;
    if (isBlockedOutreachHost(url)) {
      blocked++;
      continue;
    }
    if (hostSuggestsNonVacation(url)) {
      nonVac++;
      continue;
    }
    ok++;
    if (samples.length < 15) samples.push(url);
  }
  console.log(JSON.stringify({ scanned: rows.length, ok, blocked, nonVac, samples }, null, 2));

  // FU eligible rough
  const fu = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='sent' AND opened_at IS NOT NULL AND clicked_at IS NULL
        AND COALESCE((notes::jsonb->>'fu_step')::int,0) < 1)::int AS open_no_click,
      COUNT(*) FILTER (WHERE status='sent' AND opened_at IS NULL
        AND sent_at < NOW() - INTERVAL '3 days')::int AS silent_old
    FROM public_owner_leads
  `).catch(() => null);
  console.log('fu_probe', fu?.rows?.[0] || 'n/a');

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
