#!/usr/bin/env npx tsx
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

async function main() {
  const pool = new pg.Pool({
    connectionString:
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  const r = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='queued' AND opted_out=false)::int AS queued,
      COUNT(*) FILTER (WHERE status='sent')::int AS sent,
      COUNT(*) FILTER (WHERE status='sent' AND opened_at IS NOT NULL)::int AS opened,
      COUNT(*) FILTER (WHERE status='sent' AND clicked_at IS NOT NULL)::int AS clicked,
      COUNT(*) FILTER (
        WHERE status='sent' AND opted_out=false
          AND next_touch_at IS NOT NULL AND next_touch_at <= NOW()
      )::int AS due_touches,
      COUNT(*) FILTER (
        WHERE status='sent' AND opted_out=false
          AND next_touch_at IS NOT NULL AND next_touch_at > NOW()
      )::int AS scheduled_touches,
      COUNT(*) FILTER (
        WHERE status='sent' AND opted_out=false AND next_touch_at IS NULL
          AND opened_at IS NULL AND sent_at < NOW() - INTERVAL '4 days'
      )::int AS silent_no_schedule,
      COUNT(*) FILTER (
        WHERE status='sent' AND opted_out=false AND sequence_status IS NOT NULL
      )::int AS with_seq,
      COUNT(*) FILTER (
        WHERE status='sent' AND opted_out=false
          AND COALESCE(touch_count,0)=1 AND opened_at IS NULL
          AND sent_at < NOW() - INTERVAL '3 days'
      )::int AS cold_silent_eligible
    FROM public_owner_leads
  `);
  console.log(JSON.stringify(r.rows[0], null, 2));

  const seq = await pool.query(`
    SELECT COALESCE(sequence_status,'(null)') AS s, COUNT(*)::int AS n
    FROM public_owner_leads WHERE status='sent'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 20
  `);
  console.log('seq', seq.rows);

  const kinds = await pool.query(`
    SELECT COALESCE(next_touch_kind,'(null)') AS k, COUNT(*)::int AS n
    FROM public_owner_leads
    WHERE status='sent' AND next_touch_at IS NOT NULL AND next_touch_at <= NOW()
    GROUP BY 1 ORDER BY 2 DESC
  `);
  console.log('due_kinds', kinds.rows);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
