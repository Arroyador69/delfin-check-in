#!/usr/bin/env npx tsx
/**
 * Cumplir envíos del día (tope 1000) + rellenar cola a 1000.
 *   npx tsx scripts/public-owner-leads/catchup-send-and-refill.ts --max 300
 * Usa wave morning (siempre envía; no se corta por meta 20 altas).
 */
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

function argNum(name: string, def: number): number {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) {
    const n = Number(process.argv[i + 1]);
    if (Number.isFinite(n)) return n;
  }
  return def;
}

async function main() {
  process.env.PUBLIC_OWNER_LEADS_FLOW = process.env.PUBLIC_OWNER_LEADS_FLOW || 'A+B+C';
  const maxSend = argNum('--max', 300);

  const before = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM public_owner_leads
        WHERE status = 'sent'
          AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
            AT TIME ZONE 'Europe/Madrid') AS sent_today,
      (SELECT COUNT(*)::int FROM public_owner_leads
        WHERE signed_up_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
            AT TIME ZONE 'Europe/Madrid') AS signups_today,
      (SELECT COUNT(*)::int FROM public_owner_leads
        WHERE status = 'queued' AND opted_out = false) AS queued
  `;
  console.log('[catchup] before', before.rows[0]);

  // morning: no se bloquea por meta 20; budget = min(1000 - sentToday, maxSend)
  const result = await runDailyPublicOwnerLeads({
    dryRun: false,
    wave: 'morning',
    maxSend,
    extractLimit: 40,
  });

  const after = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM public_owner_leads
        WHERE status = 'sent'
          AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
            AT TIME ZONE 'Europe/Madrid') AS sent_today,
      (SELECT COUNT(*)::int FROM public_owner_leads
        WHERE status = 'queued' AND opted_out = false) AS queued
  `;

  console.log(
    JSON.stringify(
      {
        outreach: {
          sent: result.sent,
          failed: result.failed,
          budget: result.budget,
          refill: result.refill,
          errors: result.errors,
        },
        after: after.rows[0],
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
