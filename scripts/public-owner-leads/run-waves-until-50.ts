#!/usr/bin/env npx tsx
/**
 * Varias oleadas pequeñas hasta ~50 enviados hoy (evita timeout Neon).
 */
import { runDailyPublicOwnerLeads } from '../../src/lib/public-owner-leads/daily-run';

async function main() {
  const target = 50;
  let totalSent = 0;
  for (let i = 1; i <= 5; i++) {
    console.log(`\n=== wave ${i} ===`);
    const r = await runDailyPublicOwnerLeads({
      wave: 'morning',
      maxSend: 50,
      dryRun: false,
      extractLimit: 12,
    });
    console.log(JSON.stringify(r, null, 2));
    totalSent = r.sentTodayBefore + r.sent;
    if (totalSent >= target) break;
    if (r.leadsDiscovered === 0 && r.sent === 0 && r.sourcesProcessed > 0) {
      // seguir: puede haber más pending
    }
    await new Promise((res) => setTimeout(res, 3000));
  }
  console.log('\nTOTAL_SENT_APPROX', totalSent);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
