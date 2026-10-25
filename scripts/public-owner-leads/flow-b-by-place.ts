#!/usr/bin/env npx tsx
/**
 * Flujo B (prueba): descubrir por lugares → filtrar ICP → enviar.
 * Normas: docs/growth/CAPTACION_FLUJO_B_POR_LUGARES.md
 *
 *   npx tsx scripts/public-owner-leads/flow-b-by-place.ts --max-send 25
 *   npx tsx scripts/public-owner-leads/flow-b-by-place.ts --dry-run --max-places 6
 */
import { sql } from '../../src/lib/db';
import { isBlockedOutreachHost } from '../../src/lib/public-owner-leads/blocked-hosts';
import {
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_MIN_DELAY_MS,
} from '../../src/lib/public-owner-leads/constants';
import { discoverOwnerSitesByPlace } from '../../src/lib/public-owner-leads/discover-by-place';
import {
  domainFromUrl,
  isPlausiblePublicEmail,
  scoreEmailForSource,
} from '../../src/lib/public-owner-leads/emails';
import { extractPublicEmailsFromUrl } from '../../src/lib/public-owner-leads/extract-web';
import { sleep } from '../../src/lib/public-owner-leads/fetch-html';
import { sendTrackedOutreachLead } from '../../src/lib/public-owner-leads/send-tracked';
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
  const maxPlaces = argNum('--max-places', 10);
  const maxSend = argNum('--max-send', 30);
  const maxCandidates = argNum('--max-candidates', 35);

  console.log('[flow-b] start', { dryRun, maxPlaces, maxSend, at: new Date().toISOString() });

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
  const sentToday = Number(today.rows[0]?.n || 0);
  const budget = Math.min(maxSend, Math.max(0, PUBLIC_OWNER_LEADS_DAILY_HARD_CAP - sentToday));
  console.log({ sentToday, budget, alreadyDomains: sentDomains.size });

  const discovery = await discoverOwnerSitesByPlace({
    maxPlaces,
    maxCandidates,
    delayMs: 1100,
  });
  console.log('[flow-b] discovery', {
    places: discovery.places,
    osmHits: discovery.osmHits,
    candidates: discovery.candidateUrls.length,
    osmEmails: discovery.emailsFromOsm.length,
  });

  let discovered = 0;
  let sent = 0;
  let rejected = 0;
  const sentList: string[] = [];

  type Pick = { email: string; url: string; host: string; score: number; via: string };

  async function trySend(pick: Pick): Promise<boolean> {
    if (sentEmails.has(pick.email) || sentDomains.has(pick.host)) return false;
    discovered++;
    console.log('[flow-b] lead', pick.email, pick.host, pick.via, 'score', pick.score);
    if (dryRun) return false;

    await sql`
      INSERT INTO public_owner_lead_sources (url, status)
      VALUES (${pick.url}, 'pending')
      ON CONFLICT (url) DO NOTHING
    `.catch(() => null);

    const ins = await sql`
      INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
      VALUES (
        ${pick.email}, ${pick.host}, ${pick.url}, 'queued',
        ${`flow-b-osm:${new Date().toISOString().slice(0, 10)}`},
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    let id = ins.rows[0]?.id ? String(ins.rows[0].id) : '';
    if (!id) {
      const ex = await sql`SELECT id, status FROM public_owner_leads WHERE email=${pick.email} LIMIT 1`;
      const st = String(ex.rows[0]?.status || '');
      if (!ex.rows[0] || st === 'sent' || st === 'bounced') return false;
      id = String(ex.rows[0].id);
      await sql`
        UPDATE public_owner_leads SET status='queued', queued_at=NOW(), updated_at=NOW()
        WHERE id=${id}::uuid AND status IN ('new','skipped','failed','queued')
      `;
    }

    const result = await sendTrackedOutreachLead({
      id,
      email: pick.email,
      domain: pick.host,
      source_url: pick.url,
    });
    if (!result.ok) return false;
    sent++;
    sentEmails.add(pick.email);
    sentDomains.add(pick.host);
    sentList.push(`${pick.email} | ${pick.host} | ${pick.via}`);
    await sql`
      UPDATE public_owner_lead_sources
      SET status='done', emails_found=1, last_scraped_at=NOW(), updated_at=NOW(), last_error=NULL
      WHERE url=${pick.url}
    `.catch(() => null);
    await sleep(PUBLIC_OWNER_LEADS_MIN_DELAY_MS);
    return true;
  }

  // 1) Emails ya publicados en OSM (muy fiables)
  for (const row of discovery.emailsFromOsm) {
    if (sent >= budget) break;
    const host = domainFromUrl(row.website);
    if (!host || sentDomains.has(host) || sentEmails.has(row.email)) continue;
    if (!isPlausiblePublicEmail(row.email)) continue;
    const score = scoreEmailForSource(row.email, row.website);
    if (score < 0 && !/@(gmail|hotmail|outlook|yahoo)\./i.test(row.email)) {
      rejected++;
      continue;
    }
    await trySend({
      email: row.email,
      url: row.website,
      host,
      score: score < 0 ? 5 : score,
      via: `osm-email:${row.place}`,
    });
  }

  // 2) Resto: scrape web propia
  for (const url of discovery.candidateUrls) {
    if (sent >= budget) break;
    const host = domainFromUrl(url);
    if (!host || sentDomains.has(host)) continue;
    if (isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) {
      rejected++;
      continue;
    }

    const extracted = await extractPublicEmailsFromUrl(url, 300);
    if (extracted.blocked || !extracted.leads.length) {
      rejected++;
      continue;
    }

    const ranked = extracted.leads
      .map((l) => ({ ...l, score: scoreEmailForSource(l.email, url) }))
      .filter((l) => isPlausiblePublicEmail(l.email) && l.score >= 0)
      .sort((a, b) => b.score - a.score);

    const pick =
      ranked.find((l) => l.score >= 10) ||
      ranked.find((l) => /@(gmail|hotmail|outlook|yahoo)\./i.test(l.email) && l.score >= 5);

    if (!pick || sentEmails.has(pick.email)) {
      rejected++;
      continue;
    }

    await trySend({
      email: pick.email,
      url,
      host,
      score: pick.score,
      via: 'web-scrape',
    });
  }

  console.log(
    JSON.stringify(
      {
        flow: 'B',
        dryRun,
        places: discovery.places,
        osmHits: discovery.osmHits,
        candidates: discovery.candidateUrls.length,
        osmEmails: discovery.emailsFromOsm.length,
        discovered,
        rejected,
        sent,
        sentTodayAfter: sentToday + sent,
        sentList,
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
