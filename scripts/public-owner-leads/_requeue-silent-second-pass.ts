#!/usr/bin/env npx tsx
/**
 * Segunda pasada cold: silents exhausted (nunca abrieron) → queued de nuevo
 * con el mail nuevo (CTA llamada). No toca opens/clicks ni opted_out.
 *
 *   npx tsx scripts/public-owner-leads/_requeue-silent-second-pass.ts [limit=400]
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

const LIMIT = Number(process.argv[2] || 400);

async function main() {
  const pool = new pg.Pool({
    connectionString:
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  const note = `second-pass-call:${new Date().toISOString().slice(0, 10)}`;

  const r = await pool.query(
    `WITH cte AS (
       SELECT id
       FROM public_owner_leads
       WHERE status = 'sent'
         AND opted_out = false
         AND opened_at IS NULL
         AND clicked_at IS NULL
         AND signed_up_at IS NULL
         AND sequence_status = 'exhausted'
         AND COALESCE(touch_count, 0) <= 4
         AND sent_at < NOW() - INTERVAL '10 days'
         AND COALESCE(notes, '') NOT ILIKE '%second-pass-call%'
       ORDER BY sent_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE public_owner_leads p
     SET status = 'queued',
         queued_at = NOW(),
         sequence_status = 'active',
         next_touch_at = NULL,
         next_touch_kind = NULL,
         touch_count = 0,
         notes = CASE
           WHEN notes IS NULL OR notes = '' THEN $2
           ELSE notes || ' | ' || $2
         END,
         updated_at = NOW()
     FROM cte
     WHERE p.id = cte.id
     RETURNING p.id`,
    [LIMIT, note]
  );

  const q = await pool.query(
    `SELECT COUNT(*)::int AS n FROM public_owner_leads
     WHERE status='queued' AND opted_out=false`
  );

  console.log(
    JSON.stringify(
      { requeued: r.rowCount, queued: q.rows[0]?.n, limit: LIMIT, note },
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
