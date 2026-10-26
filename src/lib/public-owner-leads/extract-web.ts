/**
 * Extracción de emails públicos desde HTML de web propia.
 * Solo España + alquiler vacacional / rural / turístico.
 */

import { sql } from '@/lib/db';
import { isBlockedOutreachHost } from './blocked-hosts';
import {
  domainFromUrl,
  extractEmailsFromHtml,
  normalizeUrl,
  scoreEmailForSource,
} from './emails';
import { contactCandidateUrls, fetchHtml, sleep } from './fetch-html';
import { PUBLIC_OWNER_LEADS_MIN_DELAY_MS } from './constants';
import { SEED_SPAIN_AGENCY_URLS } from './seed-spain-agency-urls';
import { SEED_SPAIN_HOTEL_URLS } from './seed-spain-hotel-urls';
import {
  classifySpainVacationRental,
  extractSpainVacationOutboundLinks,
  hostSuggestsNonVacation,
  hostSuggestsVacation,
  type OutreachAudience,
} from './spain-vacation-filter';

export { isBlockedOutreachHost, domainFromUrl, normalizeUrl };

export type ExtractedLead = {
  email: string;
  domain: string;
  source_url: string;
  audience?: OutreachAudience;
};

function seedAudience(url: string): OutreachAudience | null {
  const host = domainFromUrl(url);
  if (!host) return null;
  for (const raw of SEED_SPAIN_AGENCY_URLS) {
    if (domainFromUrl(normalizeUrl(raw) || raw) === host) return 'agency';
  }
  for (const raw of SEED_SPAIN_HOTEL_URLS) {
    if (domainFromUrl(normalizeUrl(raw) || raw) === host) return 'hotel';
  }
  return null;
}

async function enqueueDiscoveredSources(urls: string[]): Promise<number> {
  const sourcesMeta = await sql`SELECT to_regclass('public.public_owner_lead_sources') AS reg`;
  if (!sourcesMeta.rows[0]?.reg) return 0;
  let n = 0;
  for (const raw of urls) {
    const url = normalizeUrl(raw);
    if (!url || isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) continue;
    try {
      const r = await sql`
        INSERT INTO public_owner_lead_sources (url, status)
        VALUES (${url}, 'pending')
        ON CONFLICT (url) DO NOTHING
        RETURNING id
      `;
      if (r.rows[0]?.id) n++;
    } catch {
      /* ignore */
    }
  }
  return n;
}

export async function extractPublicEmailsFromUrl(
  rawUrl: string,
  delayMs = PUBLIC_OWNER_LEADS_MIN_DELAY_MS
): Promise<{
  leads: ExtractedLead[];
  blocked: boolean;
  error?: string;
  discoveredSources?: number;
}> {
  const url = normalizeUrl(rawUrl);
  if (!url) return { leads: [], blocked: true, error: 'URL vacía' };
  if (isBlockedOutreachHost(url)) {
    return { leads: [], blocked: true, error: 'Host OTA/red social bloqueado' };
  }
  if (hostSuggestsNonVacation(url)) {
    return { leads: [], blocked: true, error: 'Host no vacacional (seguros/otros)' };
  }

  const candidates = contactCandidateUrls(url);
  const emailsFound = new Map<string, string>();
  let nicheOk = false;
  let lastReason = 'sin-html';
  let discoveredSources = 0;
  let firstHtml = '';
  let firstUrl = url;
  let audience: OutreachAudience = 'owner';

  for (const candidate of candidates) {
    if (isBlockedOutreachHost(candidate)) continue;
    const res = await fetchHtml(candidate, 12000);
    if (res.html) await sleep(delayMs);
    if (!res.html) continue;

    const verdict = classifySpainVacationRental(res.finalUrl || candidate, res.html);
    lastReason = verdict.reason;
    const seeded = seedAudience(url);
    if (!verdict.ok) {
      // Semillas curadas (agencia/hotel): no tumbar por HTML JS / sin .es
      if (seeded) {
        nicheOk = true;
        audience = seeded;
      } else if (!hostSuggestsVacation(url) && candidate === url) {
        continue;
      } else if (!hostSuggestsVacation(url)) {
        continue;
      } else {
        // Host tipico VR aunque el clasificador falle por umbral → seguir
        nicheOk = true;
      }
    } else {
      nicheOk = true;
      if (verdict.audience) audience = verdict.audience;
    }
    if (seeded) audience = seeded;
    if (!firstHtml) {
      firstHtml = res.html;
      firstUrl = res.finalUrl || candidate;
    }

    for (const email of extractEmailsFromHtml(res.html)) {
      if (!emailsFound.has(email)) {
        emailsFound.set(email, res.finalUrl || candidate);
      }
    }
    if (emailsFound.size > 0) break;
  }

  if (!nicheOk) {
    return {
      leads: [],
      blocked: true,
      // Antes: "no-es-alojamiento-ES" confundía con exigir TLD .es
      error: `fuera-de-nicho:${lastReason}`,
    };
  }

  if (firstHtml) {
    const outbound = extractSpainVacationOutboundLinks(firstUrl, firstHtml, 6);
    discoveredSources = await enqueueDiscoveredSources(outbound);
  }

  const ranked = [...emailsFound.entries()]
    .map(([email, source_url]) => ({
      email,
      source_url,
      score: scoreEmailForSource(email, source_url || url),
    }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);

  // Un solo email por web (el mejor: dominio coincidente / reservas@ / info@)
  const leads: ExtractedLead[] = ranked.slice(0, 1).map(({ email, source_url }) => ({
    email,
    domain: domainFromUrl(url) || domainFromUrl(source_url),
    source_url,
    audience,
  }));

  return { leads, blocked: false, discoveredSources };
}
