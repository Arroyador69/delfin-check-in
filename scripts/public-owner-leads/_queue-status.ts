#!/usr/bin/env npx tsx
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

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
  const url =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    '';
  if (!url) throw new Error('missing db url');
  const sql = neon(url);
  const leads = await sql`
    SELECT status, count(*)::int AS n FROM public_owner_leads GROUP BY 1 ORDER BY 2 DESC
  `;
  const sources = await sql`
    SELECT status, count(*)::int AS n FROM public_owner_lead_sources GROUP BY 1 ORDER BY 2 DESC
  `;
  const queued = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'queued' AND opted_out = false
  `;
  console.log(JSON.stringify({ queued: queued[0], leads, sources }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
