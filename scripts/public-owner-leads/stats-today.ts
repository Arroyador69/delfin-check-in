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
  const sent = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'sent'
      AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'
  `;
  const sentYday = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'sent'
      AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid' - INTERVAL '1 day'
      AND sent_at < date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'
  `;
  const queued = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads WHERE status = 'queued' AND opted_out = false
  `;
  const signups = await sql`
    SELECT email, signed_up_at::text, notes FROM public_owner_leads
    WHERE signed_up_at >= NOW() - INTERVAL '3 days'
    ORDER BY signed_up_at DESC LIMIT 20
  `;
  const byStatus = await sql`
    SELECT status, COUNT(*)::int AS n FROM public_owner_leads GROUP BY status ORDER BY n DESC
  `;
  const recentSent = await sql`
    SELECT email, domain, sent_at::text
    FROM public_owner_leads WHERE status = 'sent' AND sent_at IS NOT NULL
    ORDER BY sent_at DESC LIMIT 25
  `;
  const onboardingTrack = await sql`
    SELECT recipient_email, status, left(subject, 60) AS subject, created_at::text, opened_at::text, clicked_at::text
    FROM email_tracking
    WHERE email_type = 'onboarding'
      AND created_at >= NOW() - INTERVAL '3 days'
    ORDER BY created_at DESC
    LIMIT 20
  `;
  console.log(
    JSON.stringify(
      {
        sentTodayMadrid: sent.rows[0]?.n,
        sentYesterdayMadrid: sentYday.rows[0]?.n,
        queuedReady: queued.rows[0]?.n,
        leadsByStatus: byStatus.rows,
        recentSignups: signups.rows,
        recentSent: recentSent.rows,
        onboardingEmails: onboardingTrack.rows,
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
