#!/usr/bin/env npx tsx
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

async function main() {
  const r = await sql`
    UPDATE public_owner_leads
    SET
      status = 'queued',
      queued_at = COALESCE(queued_at, NOW()),
      updated_at = NOW(),
      notes = COALESCE(notes, '') || ' | requeue-zoho-fail'
    WHERE status = 'skipped'
      AND (
        last_error ILIKE '%Unusual sending activity%'
        OR last_error ILIKE '%550 5.4.6%'
        OR last_error ILIKE '%try after sometime%'
      )
    RETURNING id
  `;
  const q = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'queued' AND opted_out = false
  `;
  console.log(JSON.stringify({ requeued: r.rows.length, queuedNow: q.rows[0]?.n }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
