#!/usr/bin/env npx tsx
/** Quita de cola leads cuyo email/dominio ya fue enviado. */
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
  const byDomain = await sql`
    WITH bad AS (
      SELECT q.id
      FROM public_owner_leads q
      WHERE q.status = 'queued' AND q.opted_out = false
        AND coalesce(q.domain, '') <> ''
        AND EXISTS (
          SELECT 1 FROM public_owner_leads s
          WHERE s.status = 'sent'
            AND lower(regexp_replace(coalesce(s.domain,''), '^www\\.', ''))
              = lower(regexp_replace(coalesce(q.domain,''), '^www\\.', ''))
        )
    )
    UPDATE public_owner_leads p
    SET status = 'skipped',
        notes = coalesce(notes,'') || ' | skip:domain-already-sent:cleanup',
        updated_at = NOW()
    FROM bad WHERE p.id = bad.id
    RETURNING p.id
  `;
  const byEmail = await sql`
    WITH bad AS (
      SELECT q.id
      FROM public_owner_leads q
      WHERE q.status = 'queued' AND q.opted_out = false
        AND EXISTS (
          SELECT 1 FROM public_owner_leads s
          WHERE s.status = 'sent' AND lower(s.email) = lower(q.email)
        )
    )
    UPDATE public_owner_leads p
    SET status = 'skipped',
        notes = coalesce(notes,'') || ' | skip:email-already-sent:cleanup',
        updated_at = NOW()
    FROM bad WHERE p.id = bad.id
    RETURNING p.id
  `;
  const q = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'queued' AND opted_out = false
  `;
  const sent = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'sent'
      AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
        AT TIME ZONE 'Europe/Madrid'
  `;
  console.log(
    JSON.stringify(
      {
        cleanedDomains: byDomain.rows.length,
        cleanedEmails: byEmail.rows.length,
        queuedReady: q.rows[0]?.n,
        sentToday: sent.rows[0]?.n,
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
