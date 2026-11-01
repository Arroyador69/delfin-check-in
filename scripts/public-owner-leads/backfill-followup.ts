#!/usr/bin/env npx tsx
/**
 * Backfill de follow-up outreach (idempotente). Aplicar antes la migración:
 *   psql "$POSTGRES_URL" -f database/migration-public-owner-leads-followup.sql
 *
 *   npx tsx scripts/public-owner-leads/backfill-followup.ts --dry-run
 *   npx tsx scripts/public-owner-leads/backfill-followup.ts
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

import { backfillFollowUpSchedules } from '../../src/lib/public-owner-leads/backfill-followup';
import { followUpCounts } from '../../src/lib/public-owner-leads/select-followups';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const result = await backfillFollowUpSchedules({ dryRun });
  console.log(JSON.stringify(result, null, 2));
  if (!dryRun) {
    console.log(JSON.stringify({ afterBackfill: await followUpCounts() }, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
