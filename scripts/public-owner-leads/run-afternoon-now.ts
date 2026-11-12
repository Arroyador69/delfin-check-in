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
if (process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

async function main() {
  const { runDailyPublicOwnerLeads } = await import(
    '../../src/lib/public-owner-leads/daily-run'
  );
  console.log('[run-afternoon-now]', new Date().toISOString());
  const r = await runDailyPublicOwnerLeads({
    wave: 'afternoon',
    maxSend: Number(process.argv.find((a) => a.startsWith('--max='))?.slice(6) || 80),
    extractLimit: 20,
    dryRun: process.argv.includes('--dry-run'),
  });
  console.log(JSON.stringify(r, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
