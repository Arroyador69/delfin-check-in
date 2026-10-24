/**
 * Extracción de emails públicos desde HTML de web propia.
 */

import { isBlockedOutreachHost } from './blocked-hosts';
import { domainFromUrl, extractEmailsFromHtml, normalizeUrl } from './emails';
import { contactCandidateUrls, fetchHtml, sleep } from './fetch-html';
import { PUBLIC_OWNER_LEADS_MIN_DELAY_MS } from './constants';

export { isBlockedOutreachHost, domainFromUrl, normalizeUrl };

export type ExtractedLead = {
  email: string;
  domain: string;
  source_url: string;
};

export async function extractPublicEmailsFromUrl(
  rawUrl: string,
  delayMs = PUBLIC_OWNER_LEADS_MIN_DELAY_MS
): Promise<{ leads: ExtractedLead[]; blocked: boolean; error?: string }> {
  const url = normalizeUrl(rawUrl);
  if (!url) return { leads: [], blocked: true, error: 'URL vacía' };
  if (isBlockedOutreachHost(url)) {
    return { leads: [], blocked: true, error: 'Host OTA/red social bloqueado' };
  }

  const candidates = contactCandidateUrls(url);
  const emailsFound = new Map<string, string>();

  for (const candidate of candidates) {
    if (isBlockedOutreachHost(candidate)) continue;
    const res = await fetchHtml(candidate);
    await sleep(delayMs);
    if (!res.html) continue;
    for (const email of extractEmailsFromHtml(res.html)) {
      if (!emailsFound.has(email)) {
        emailsFound.set(email, res.finalUrl || candidate);
      }
    }
    if (emailsFound.size > 0 && candidate !== url) break;
  }

  const leads: ExtractedLead[] = [...emailsFound.entries()].map(([email, source_url]) => ({
    email,
    domain: domainFromUrl(source_url) || domainFromUrl(url),
    source_url,
  }));

  return { leads, blocked: false };
}
