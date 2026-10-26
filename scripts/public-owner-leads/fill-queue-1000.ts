#!/usr/bin/env npx tsx
/** Rellena cola a ≥1000 sin enviar. */
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

import { runDailyPublicOwnerLeads } from '../../src/lib/public-owner-leads/daily-run';
import { sql } from '../../src/lib/db';

async function main() {
  process.env.PUBLIC_OWNER_LEADS_FLOW = process.env.PUBLIC_OWNER_LEADS_FLOW || 'A+B+C';
  const prep = await runDailyPublicOwnerLeads({
    dryRun: false,
    wave: 'prepare',
    maxSend: 0,
    extractLimit: 50,
  });
  const after = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM public_owner_leads WHERE status='queued' AND opted_out=false) AS queued,
      (SELECT COUNT(*)::int FROM public_owner_leads WHERE status='new' AND opted_out=false) AS new_ready,
      (SELECT COUNT(*)::int FROM public_owner_leads
        WHERE status='sent'
          AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
            AT TIME ZONE 'Europe/Madrid') AS sent_today
  `;
  console.log(
    JSON.stringify(
      { refill: prep.refill, errors: prep.errors?.slice(-8), after: after.rows[0] },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
