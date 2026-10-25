#!/usr/bin/env npx tsx
import { runDailyPublicOwnerLeads } from '../../src/lib/public-owner-leads/daily-run';

async function main() {
  console.log('[run-afternoon-now]', new Date().toISOString());
  const r = await runDailyPublicOwnerLeads({
    wave: 'afternoon',
    maxSend: 50,
    extractLimit: 30,
    dryRun: process.argv.includes('--dry-run'),
  });
  console.log(JSON.stringify(r, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
