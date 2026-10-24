/**
 * Extracción de emails públicos desde HTML de web propia.
 * Solo España + alquiler vacacional / rural / turístico.
 */

import { sql } from '@/lib/db';
import { isBlockedOutreachHost } from './blocked-hosts';
import { domainFromUrl, extractEmailsFromHtml, normalizeUrl } from './emails';
import { contactCandidateUrls, fetchHtml, sleep } from './fetch-html';
import { PUBLIC_OWNER_LEADS_MIN_DELAY_MS } from './constants';
import {
  classifySpainVacationRental,
  extractSpainVacationOutboundLinks,
  hostSuggestsNonVacation,
} from './spain-vacation-filter';

export { isBlockedOutreachHost, domainFromUrl, normalizeUrl };

export type ExtractedLead = {
  email: string;
  domain: string;
  source_url: string;
};

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

  for (const candidate of candidates) {
    if (isBlockedOutreachHost(candidate)) continue;
    const res = await fetchHtml(candidate);
    await sleep(delayMs);
    if (!res.html) continue;

    const verdict = classifySpainVacationRental(res.finalUrl || candidate, res.html);
    lastReason = verdict.reason;
    if (!verdict.ok) {
      // Si la home no pasa, no extraemos emails de esta web
      continue;
    }
    nicheOk = true;
    if (!firstHtml) {
      firstHtml = res.html;
      firstUrl = res.finalUrl || candidate;
    }

    for (const email of extractEmailsFromHtml(res.html)) {
      if (!emailsFound.has(email)) {
        emailsFound.set(email, res.finalUrl || candidate);
      }
    }
    if (emailsFound.size > 0 && candidate !== url) break;
  }

  if (!nicheOk) {
    return {
      leads: [],
      blocked: true,
      error: `no-es-alojamiento-ES:${lastReason}`,
    };
  }

  if (firstHtml) {
    const outbound = extractSpainVacationOutboundLinks(firstUrl, firstHtml, 6);
    discoveredSources = await enqueueDiscoveredSources(outbound);
  }

  const leads: ExtractedLead[] = [...emailsFound.entries()].map(([email, source_url]) => ({
    email,
    domain: domainFromUrl(source_url) || domainFromUrl(url),
    source_url,
  }));

  return { leads, blocked: false, discoveredSources };
}
