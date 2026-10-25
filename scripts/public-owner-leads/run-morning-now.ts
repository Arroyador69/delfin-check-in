#!/usr/bin/env npx tsx
/**
 * One-shot: oleada mañana (scrape + envío hasta 50) con código local.
 * Uso: set -a && source .env.outreach.local && set +a && npx tsx scripts/public-owner-leads/run-morning-now.ts
 */
import { runDailyPublicOwnerLeads } from '../../src/lib/public-owner-leads/daily-run';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log('[run-morning-now] start', { dryRun, at: new Date().toISOString() });
  const r = await runDailyPublicOwnerLeads({
    wave: 'morning',
    maxSend: 50,
    dryRun,
    // Lotes medianos: evita timeouts Neon; el cron puede repetir
    extractLimit: 18,
  });
  console.log(JSON.stringify(r, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
