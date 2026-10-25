/** Fetch HTML con rate limit y User-Agent identificable. */

import { isBlockedOutreachHost } from './blocked-hosts';

const USER_AGENT =
  'DelfinCheckInPublicLeadsBot/1.0 (+https://delfincheckin.com; outreach-research; contact=soporte@delfincheckin.com)';

/** Rutas donde suele aparecer el email (pocas: caber en timeout del cron). */
const CONTACT_PATHS = [
  '/contacto',
  '/contact',
  '/contactanos',
  '/aviso-legal',
  '/politica-de-privacidad',
  '/reservas',
];

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchHtml(
  url: string,
  timeoutMs = 20000
): Promise<{ ok: boolean; status: number; html: string; finalUrl: string }> {
  if (isBlockedOutreachHost(url)) {
    return { ok: false, status: 0, html: '', finalUrl: url };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('html') && !ctype.includes('text/plain') && ctype.length > 0) {
      return { ok: false, status: res.status, html: '', finalUrl: res.url };
    }
    const html = await res.text();
    return { ok: res.ok, status: res.status, html, finalUrl: res.url };
  } catch {
    return { ok: false, status: 0, html: '', finalUrl: url };
  } finally {
    clearTimeout(timer);
  }
}

/** Página principal + rutas de contacto típicas (mismo origen). */
export function contactCandidateUrls(baseUrl: string): string[] {
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [baseUrl];
  }
  const urls = [baseUrl];
  for (const path of CONTACT_PATHS) {
    urls.push(`${origin}${path}`);
  }
  return [...new Set(urls)];
}
