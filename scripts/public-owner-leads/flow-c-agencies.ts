#!/usr/bin/env npx tsx
/**
 * Flujo C: semillas agencias gestoras vacacionales ES → extract → enviar.
 * Normas: docs/growth/CAPTACION_FLUJO_C_AGENCIAS.md
 *
 * Desde delfin-check-in/:
 *   npx tsx scripts/public-owner-leads/flow-c-agencies.ts --max-send 25
 *   npx tsx scripts/public-owner-leads/flow-c-agencies.ts --dry-run
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

import { sql } from '../../src/lib/db';
import {
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_MIN_DELAY_MS,
} from '../../src/lib/public-owner-leads/constants';
import { ensureSpainAgencySourceQueue } from '../../src/lib/public-owner-leads/ensure-source-queue';
import { extractPublicEmailsFromUrl } from '../../src/lib/public-owner-leads/extract-web';
import { sleep } from '../../src/lib/public-owner-leads/fetch-html';
import { isPlausiblePublicEmail, scoreEmailForSource } from '../../src/lib/public-owner-leads/emails';
import { sendTrackedOutreachLead } from '../../src/lib/public-owner-leads/send-tracked';
import { SEED_SPAIN_AGENCY_URLS } from '../../src/lib/public-owner-leads/seed-spain-agency-urls';
import { isBlockedOutreachHost, normalizeUrl } from '../../src/lib/public-owner-leads/extract-web';
import { hostSuggestsNonVacation } from '../../src/lib/public-owner-leads/spain-vacation-filter';

function argNum(name: string, def: number): number {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) {
    const n = Number(process.argv[i + 1]);
    if (Number.isFinite(n)) return n;
  }
  return def;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const maxSend = argNum('--max-send', 30);

  const withOsm = process.argv.includes('--with-osm');
  console.log('[flow-c] start', {
    dryRun,
    maxSend,
    seeds: SEED_SPAIN_AGENCY_URLS.length,
    withOsm,
  });

  if (!dryRun) {
    const seeded = await ensureSpainAgencySourceQueue();
    console.log('[flow-c] seed', seeded);
  }

  // Volumen ES: OSM por lugares (no solo las ~semillas). Misma cola que A+B.
  if (withOsm) {
    const { discoverOwnerSitesByPlace } = await import(
      '../../src/lib/public-owner-leads/discover-by-place'
    );
    const disc = await discoverOwnerSitesByPlace({
      maxPlaces: argNum('--max-places', 20),
      maxCandidates: argNum('--max-candidates', 80),
      delayMs: 450,
      deadlineMs: 120_000,
    });
    console.log('[flow-c] osm', {
      places: disc.places.length,
      websites: disc.candidateUrls.length,
      osmEmails: disc.emailsFromOsm.length,
    });
    if (!dryRun) {
      for (const url of disc.candidateUrls) {
        await sql`
          INSERT INTO public_owner_lead_sources (url, status)
          VALUES (${url}, 'pending')
          ON CONFLICT (url) DO NOTHING
        `;
      }
      for (const row of disc.emailsFromOsm) {
        const host = String(row.website || '')
          .replace(/^https?:\/\//i, '')
          .replace(/^www\./i, '')
          .split('/')[0]
          .toLowerCase();
        if (!host) continue;
        await sql`
          INSERT INTO public_owner_leads (email, domain, source_url, status, notes)
          VALUES (
            ${row.email},
            ${host},
            ${row.website},
            'new',
            ${`flow-c-osm:${row.place}`}
          )
          ON CONFLICT (email) DO NOTHING
        `;
      }
    } else {
      for (const row of disc.emailsFromOsm.slice(0, 20)) {
        console.log('[flow-c] osm-dry', row.email, row.website, row.place);
      }
    }
  }

  const sentEmails = new Set<string>();
  const sentDomains = new Set<string>();
  const sentRows = await sql`
    SELECT lower(email) AS e, lower(regexp_replace(coalesce(domain,''), '^www\\.', '')) AS d
    FROM public_owner_leads WHERE status = 'sent'
  `;
  for (const r of sentRows.rows) {
    if (r.e) sentEmails.add(String(r.e));
    if (r.d) sentDomains.add(String(r.d));
  }

  const today = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'sent'
      AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
        AT TIME ZONE 'Europe/Madrid'
  `;
  let sentToday = Number(today.rows[0]?.n || 0);
  const budget = Math.max(0, Math.min(maxSend, PUBLIC_OWNER_LEADS_DAILY_HARD_CAP - sentToday));
  console.log('[flow-c] budget', { sentToday, budget });

  let sent = 0;
  let discovered = 0;

  for (const raw of SEED_SPAIN_AGENCY_URLS) {
    if (sent >= budget) break;
    const url = normalizeUrl(raw);
    if (!url || isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) continue;

    const { leads, blocked, error } = await extractPublicEmailsFromUrl(url);
    if (blocked) {
      console.log('[flow-c] skip', url, error);
      continue;
    }

    for (const lead of leads) {
      if (sent >= budget) break;
      const email = lead.email.toLowerCase();
      const domain = (lead.domain || '').toLowerCase().replace(/^www\./, '');
      if (!isPlausiblePublicEmail(email) || scoreEmailForSource(email, lead.source_url) < 0) continue;
      if (sentEmails.has(email) || (domain && sentDomains.has(domain))) {
        console.log('[flow-c] dedupe', email, domain);
        continue;
      }

      discovered++;
      const note = `flow-c:agency:${new Date().toISOString().slice(0, 10)}`;
      if (dryRun) {
        console.log('[flow-c] dry', email, domain, lead.audience);
        continue;
      }

      const ins = await sql`
        INSERT INTO public_owner_leads (email, domain, source_url, status, notes)
        VALUES (${email}, ${domain}, ${lead.source_url}, 'queued', ${note})
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email, domain, source_url, notes
      `;
      let row = ins;
      if (!ins.rows[0]) {
        row = await sql`
          SELECT id, email, domain, source_url, notes FROM public_owner_leads
          WHERE email = ${email} AND status IN ('new', 'queued') LIMIT 1
        `;
        if (row.rows[0]) {
          await sql`
            UPDATE public_owner_leads
            SET status = 'queued', notes = COALESCE(notes, '') || ' | ' || ${note}, updated_at = NOW()
            WHERE id = ${row.rows[0].id}::uuid AND status <> 'sent'
          `;
        }
      }
      if (!row.rows[0]) continue;

      const result = await sendTrackedOutreachLead({
        id: String(row.rows[0].id),
        email,
        domain,
        source_url: String(row.rows[0].source_url || lead.source_url),
        audience: lead.audience === 'hotel' ? 'hotel' : 'agency',
      });
      if (result.ok) {
        sent++;
        sentEmails.add(email);
        if (domain) sentDomains.add(domain);
        console.log('[flow-c] sent', email, domain);
      } else {
        console.log('[flow-c] fail', email, result.error);
      }
      await sleep(PUBLIC_OWNER_LEADS_MIN_DELAY_MS);
    }
  }

  console.log('[flow-c] done', { discovered, sent, dryRun });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
