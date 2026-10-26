#!/usr/bin/env npx tsx
/**
 * PREPARAR oleada: descubrir + extraer + encolar. NUNCA envía mails.
 *
 * Objetivo: stock suficiente (agencias / hoteles / dueños ES) para las
 * oleadas del cron (09:00 / 15:00 / 18:00) hasta meta 20 altas/día.
 *
 *   cd delfin-check-in
 *   npx tsx scripts/public-owner-leads/harvest-prepare-wave.ts
 *   npx tsx scripts/public-owner-leads/harvest-prepare-wave.ts --target-queued 120
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
import { PUBLIC_OWNER_LEADS_MIN_DELAY_MS } from '../../src/lib/public-owner-leads/constants';
import {
  ensureSpainAgencySourceQueue,
  ensureSpainVacationSourceQueue,
  recycleEmptySources,
} from '../../src/lib/public-owner-leads/ensure-source-queue';
import {
  extractPublicEmailsFromUrl,
  isBlockedOutreachHost,
  normalizeUrl,
} from '../../src/lib/public-owner-leads/extract-web';
import { sleep } from '../../src/lib/public-owner-leads/fetch-html';
import {
  isPlausiblePublicEmail,
  scoreEmailForSource,
} from '../../src/lib/public-owner-leads/emails';
import { SEED_SPAIN_AGENCY_URLS } from '../../src/lib/public-owner-leads/seed-spain-agency-urls';
import { SEED_SPAIN_HOTEL_URLS } from '../../src/lib/public-owner-leads/seed-spain-hotel-urls';
import { hostSuggestsNonVacation } from '../../src/lib/public-owner-leads/spain-vacation-filter';

function argNum(name: string, def: number): number {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) {
    const n = Number(process.argv[i + 1]);
    if (Number.isFinite(n)) return n;
  }
  return def;
}

async function countReady(): Promise<{ queued: number; neu: number; sourcesPending: number }> {
  const q = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM public_owner_leads WHERE status = 'queued' AND opted_out = false) AS queued,
      (SELECT COUNT(*)::int FROM public_owner_leads WHERE status = 'new' AND opted_out = false) AS neu,
      (SELECT COUNT(*)::int FROM public_owner_lead_sources WHERE status = 'pending') AS sources_pending
  `;
  return {
    queued: Number(q.rows[0]?.queued || 0),
    neu: Number(q.rows[0]?.neu || 0),
    sourcesPending: Number(q.rows[0]?.sources_pending || 0),
  };
}

async function alreadyUsed(): Promise<{ emails: Set<string>; domains: Set<string> }> {
  const emails = new Set<string>();
  const domains = new Set<string>();
  const rows = await sql`
    SELECT lower(email) AS e, lower(regexp_replace(coalesce(domain,''), '^www\\.', '')) AS d, status
    FROM public_owner_leads
    WHERE status IN ('sent', 'queued', 'new', 'bounced', 'skipped')
  `;
  for (const r of rows.rows) {
    if (r.e) emails.add(String(r.e));
    if (r.d && (r.status === 'sent' || r.status === 'queued')) domains.add(String(r.d));
  }
  return { emails, domains };
}

async function enqueueLead(opts: {
  email: string;
  domain: string;
  source_url: string;
  note: string;
  emails: Set<string>;
  domains: Set<string>;
}): Promise<'queued' | 'skip'> {
  const email = opts.email.toLowerCase();
  const domain = opts.domain.toLowerCase().replace(/^www\./, '');
  if (opts.emails.has(email)) return 'skip';
  if (domain && opts.domains.has(domain)) return 'skip';
  if (!isPlausiblePublicEmail(email) || scoreEmailForSource(email, opts.source_url) < 0) {
    return 'skip';
  }

  const ins = await sql`
    INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
    VALUES (${email}, ${domain}, ${opts.source_url}, 'queued', ${opts.note}, NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;
  if (!ins.rows[0]) {
    // Ya existía new → pasar a queued si no sent
    const up = await sql`
      UPDATE public_owner_leads
      SET status = 'queued', queued_at = COALESCE(queued_at, NOW()),
          notes = COALESCE(notes, '') || ' | ' || ${opts.note},
          updated_at = NOW()
      WHERE lower(email) = ${email}
        AND status IN ('new')
        AND opted_out = false
      RETURNING id
    `;
    if (!up.rows[0]) return 'skip';
  }
  opts.emails.add(email);
  if (domain) opts.domains.add(domain);
  return 'queued';
}

async function harvestUrlList(
  urls: readonly string[],
  notePrefix: string,
  audienceDefault: 'agency' | 'hotel' | 'owner',
  used: { emails: Set<string>; domains: Set<string> },
  limit: number
): Promise<number> {
  let n = 0;
  for (const raw of urls) {
    if (n >= limit) break;
    const url = normalizeUrl(raw);
    if (!url || isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) continue;

    const { leads, blocked, error } = await extractPublicEmailsFromUrl(url);
    if (blocked || !leads.length) {
      console.log('[harvest] skip', url, error || 'sin-email');
      await sleep(PUBLIC_OWNER_LEADS_MIN_DELAY_MS);
      continue;
    }

    for (const lead of leads) {
      if (n >= limit) break;
      const aud = lead.audience || audienceDefault;
      const note = `${notePrefix}:${aud}:${new Date().toISOString().slice(0, 10)}`;
      const r = await enqueueLead({
        email: lead.email,
        domain: lead.domain,
        source_url: lead.source_url,
        note,
        emails: used.emails,
        domains: used.domains,
      });
      if (r === 'queued') {
        n++;
        console.log('[harvest] queued', lead.email, lead.domain, aud);
      }
    }
    await sleep(PUBLIC_OWNER_LEADS_MIN_DELAY_MS);
  }
  return n;
}

async function main() {
  const targetQueued = argNum('--target-queued', 100);
  const extractLimit = argNum('--extract', 80);

  console.log('[harvest] PREPARE ONLY — no se envía ningún mail');
  console.log('[harvest] target queued', targetQueued);

  const before = await countReady();
  console.log('[harvest] before', before);

  const seedA = await ensureSpainVacationSourceQueue();
  const seedC = await ensureSpainAgencySourceQueue();
  const recycled = await recycleEmptySources(80);
  // Hoteles: insertar fuentes
  let hotelSources = 0;
  for (const raw of SEED_SPAIN_HOTEL_URLS) {
    const url = normalizeUrl(raw);
    if (!url || isBlockedOutreachHost(url)) continue;
    const r = await sql`
      INSERT INTO public_owner_lead_sources (url, status)
      VALUES (${url}, 'pending')
      ON CONFLICT (url) DO NOTHING
      RETURNING id
    `;
    if (r.rows[0]) hotelSources++;
  }
  console.log('[harvest] seeds', { seedA, seedC, hotelSources, recycled });

  const used = await alreadyUsed();
  let queuedNow = 0;

  // 1) Agencias primero (prioridad comercial)
  queuedNow += await harvestUrlList(
    SEED_SPAIN_AGENCY_URLS,
    'prepare:flow-c',
    'agency',
    used,
    extractLimit
  );

  // 2) Hoteles / hostales
  const left = Math.max(0, targetQueued - before.queued - queuedNow);
  if (left > 0) {
    queuedNow += await harvestUrlList(
      SEED_SPAIN_HOTEL_URLS,
      'prepare:hotel',
      'hotel',
      used,
      left
    );
  }

  // 3) OSM (si responde) → fuentes + emails directos a queued
  try {
    const { discoverOwnerSitesByPlace } = await import(
      '../../src/lib/public-owner-leads/discover-by-place'
    );
    const disc = await discoverOwnerSitesByPlace({
      maxPlaces: argNum('--max-places', 12),
      maxCandidates: 60,
      delayMs: 300,
      deadlineMs: 90_000,
    });
    let osmSources = 0;
    for (const url of disc.candidateUrls) {
      const r = await sql`
        INSERT INTO public_owner_lead_sources (url, status)
        VALUES (${url}, 'pending')
        ON CONFLICT (url) DO NOTHING
        RETURNING id
      `;
      if (r.rows[0]) osmSources++;
    }
    for (const row of disc.emailsFromOsm) {
      if (before.queued + queuedNow >= targetQueued) break;
      const host = String(row.website || '')
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0]
        .toLowerCase();
      const r = await enqueueLead({
        email: row.email,
        domain: host,
        source_url: row.website,
        note: `prepare:osm:${row.place}`,
        emails: used.emails,
        domains: used.domains,
      });
      if (r === 'queued') queuedNow++;
    }
    console.log('[harvest] osm', {
      places: disc.places.length,
      websites: disc.candidateUrls.length,
      osmEmails: disc.emailsFromOsm.length,
      osmSources,
    });
  } catch (e) {
    console.warn('[harvest] osm soft-fail', e instanceof Error ? e.message : e);
  }

  // 4) Scrapear fuentes pending (dueños + lo encolado) hasta target
  const pending = await sql`
    SELECT id, url FROM public_owner_lead_sources
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT ${extractLimit}
  `;
  for (const row of pending.rows) {
    const ready = await countReady();
    if (ready.queued >= targetQueued) break;
    const url = normalizeUrl(String(row.url || ''));
    if (!url) continue;
    try {
      const { leads, blocked, error } = await extractPublicEmailsFromUrl(url);
      if (blocked) {
        await sql`
          UPDATE public_owner_lead_sources
          SET status = 'blocked', last_error = ${error || 'blocked'}, last_scraped_at = NOW()
          WHERE id = ${row.id}::uuid
        `;
        continue;
      }
      let found = 0;
      for (const lead of leads) {
        const aud = lead.audience || 'owner';
        const note =
          aud === 'agency'
            ? `prepare:agency:${new Date().toISOString().slice(0, 10)}`
            : aud === 'hotel'
              ? `prepare:hotel:${new Date().toISOString().slice(0, 10)}`
              : `prepare:owner:${new Date().toISOString().slice(0, 10)}`;
        const r = await enqueueLead({
          email: lead.email,
          domain: lead.domain,
          source_url: lead.source_url,
          note,
          emails: used.emails,
          domains: used.domains,
        });
        if (r === 'queued') {
          found++;
          queuedNow++;
        }
      }
      await sql`
        UPDATE public_owner_lead_sources
        SET status = 'done', emails_found = ${found}, last_scraped_at = NOW(), updated_at = NOW()
        WHERE id = ${row.id}::uuid
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sql`
        UPDATE public_owner_lead_sources
        SET status = 'failed', last_error = ${msg.slice(0, 400)}, last_scraped_at = NOW()
        WHERE id = ${row.id}::uuid
      `;
    }
    await sleep(PUBLIC_OWNER_LEADS_MIN_DELAY_MS);
  }

  // Promover cualquier 'new' restante a queued (listos para oleada)
  const promoted = await sql`
    UPDATE public_owner_leads
    SET status = 'queued', queued_at = COALESCE(queued_at, NOW()), updated_at = NOW()
    WHERE status = 'new' AND opted_out = false
    RETURNING id
  `;

  const after = await countReady();
  console.log(
    JSON.stringify(
      {
        mode: 'prepare_only_no_send',
        queuedThisRun: queuedNow,
        promotedNewToQueued: promoted.rows.length,
        before,
        after,
        agencySeeds: SEED_SPAIN_AGENCY_URLS.length,
        hotelSeeds: SEED_SPAIN_HOTEL_URLS.length,
        note: 'Los cron 09/15/18 enviarán desde status=queued. No se ha enviado nada ahora.',
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
