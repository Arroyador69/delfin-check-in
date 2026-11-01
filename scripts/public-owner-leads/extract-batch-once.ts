#!/usr/bin/env npx tsx
/** Un lote corto de extract (anti Neon timeout). Exit 0 siempre. */
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
process.env.POSTGRES_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
delete process.env.POSTGRES_URL_NON_POOLING;

import { sql } from '../../src/lib/db';
import { extractPublicEmailsFromUrl, normalizeUrl } from '../../src/lib/public-owner-leads/extract-web';
import {
  domainFromUrl,
  isPlausiblePublicEmail,
  scoreEmailForSource,
} from '../../src/lib/public-owner-leads/emails';
import { isBlockedOutreachHost } from '../../src/lib/public-owner-leads/blocked-hosts';
import { hostSuggestsNonVacation } from '../../src/lib/public-owner-leads/spain-vacation-filter';
import { sleep } from '../../src/lib/public-owner-leads/fetch-html';

const batch = Math.min(
  40,
  Math.max(5, Number(process.argv[2] || 25) || 25)
);

async function main() {
  const usedEmail = new Set<string>();
  const already = await sql`
    SELECT lower(email) AS e
    FROM public_owner_leads WHERE status IN ('sent','queued','new','bounced','skipped')
  `;
  for (const r of already.rows) {
    if (r.e) usedEmail.add(String(r.e));
  }

  const pending = await sql`
    SELECT id, url FROM public_owner_lead_sources
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT ${batch}
  `;

  let extracted = 0;
  for (const row of pending.rows) {
    const url = normalizeUrl(String(row.url || ''));
    if (!url || isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) {
      await sql`
        UPDATE public_owner_lead_sources
        SET status='blocked', last_scraped_at=NOW() WHERE id=${row.id}::uuid
      `;
      continue;
    }
    try {
      const { leads, blocked, error } = await extractPublicEmailsFromUrl(url);
      if (blocked) {
        await sql`
          UPDATE public_owner_lead_sources
          SET status='blocked', last_error=${error || 'blocked'}, last_scraped_at=NOW()
          WHERE id=${row.id}::uuid
        `;
        continue;
      }
      let found = 0;
      for (const lead of leads) {
        const email = lead.email.toLowerCase();
        const domain = (lead.domain || domainFromUrl(lead.source_url) || '').replace(
          /^www\./,
          ''
        );
        if (!isPlausiblePublicEmail(email) || scoreEmailForSource(email, lead.source_url) < 0)
          continue;
        if (usedEmail.has(email)) continue;
        const note = `fill-batch:${new Date().toISOString().slice(0, 10)}`;
        const ins = await sql`
          INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
          VALUES (${email}, ${domain}, ${lead.source_url}, 'queued', ${note}, NOW())
          ON CONFLICT (email) DO NOTHING RETURNING id
        `;
        if (ins.rows[0]) {
          found++;
          extracted++;
          usedEmail.add(email);
        }
      }
      await sql`
        UPDATE public_owner_lead_sources
        SET status='done', emails_found=${found}, last_scraped_at=NOW(), updated_at=NOW()
        WHERE id=${row.id}::uuid
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sql`
        UPDATE public_owner_lead_sources
        SET status='failed', last_error=${msg.slice(0, 400)}, last_scraped_at=NOW()
        WHERE id=${row.id}::uuid
      `;
    }
    await sleep(200);
  }

  const q = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads WHERE status='queued' AND opted_out=false
  `;
  const p = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_lead_sources WHERE status='pending'
  `;
  console.log(
    JSON.stringify({
      batch,
      processed: pending.rows.length,
      extracted,
      queued: q.rows[0]?.n,
      pending: p.rows[0]?.n,
    })
  );
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
