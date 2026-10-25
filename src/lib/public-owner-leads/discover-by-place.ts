/**
 * Flujo B: descubrir webs de alojamiento ES por lugar vía OpenStreetMap (Overpass).
 * Normas: docs/growth/CAPTACION_FLUJO_B_POR_LUGARES.md
 *
 * No usamos Google/Bing/DDG (captchas). OSM da `website` + a veces `email` de
 * tourism=apartment|chalet|guest_house|camp_site en el área del pueblo/comarca.
 */

import { isBlockedOutreachHost } from './blocked-hosts';
import { domainFromUrl, isPlausiblePublicEmail, normalizeEmail, normalizeUrl } from './emails';
import { sleep } from './fetch-html';
import { pickPlacesForRun } from './places-es';
import {
  hostSuggestsNonVacation,
  hostSuggestsVacation,
} from './spain-vacation-filter';

const UA =
  'DelfinCheckInPublicLeadsBot/1.0 (+https://delfincheckin.com; osm-place-discovery; contact=soporte@delfincheckin.com)';

const PORTAL_HOST =
  /casasruralesen|campingsde|barcelonacampings|alojamientorural|turismo-rural|escapada|booking|airbnb|kayak|rusticae|tripadvisor|fedcamping|campingred|misterplan|ruralgest|idealista|fotocasa|wordpress\.com|wix\.com|facebook|instagram|gob\.es|rediris/i;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export type PlaceOsmLead = {
  place: string;
  name: string;
  website: string;
  email?: string;
  tourism?: string;
};

export type PlaceDiscoveryResult = {
  places: string[];
  osmHits: number;
  candidateUrls: string[];
  emailsFromOsm: Array<{ email: string; website: string; place: string; name: string }>;
  leads: PlaceOsmLead[];
};

function overpassQueryForPlace(place: string): string {
  // area por nombre (municipio/comarca); tourism con website
  const esc = place.replace(/"/g, '\\"');
  return `
[out:json][timeout:75];
area["name"="${esc}"]["admin_level"~"^[6-8]$"]->.searchArea;
(
  nwr(area.searchArea)["tourism"~"^(apartment|chalet|guest_house|hostel|camp_site|alpine_hut)$"]["website"];
  nwr(area.searchArea)["tourism"~"^(apartment|chalet|guest_house|hostel|camp_site)$"]["contact:website"];
  nwr(area.searchArea)["tourism"="hotel"]["stars"~"^[123]$"]["website"];
);
out tags 35;
`.trim();
}

async function fetchOverpass(query: string): Promise<unknown[]> {
  let lastErr: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': UA,
          Accept: 'application/json',
        },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) {
        lastErr = new Error(`overpass ${res.status}`);
        continue;
      }
      const j = (await res.json()) as { elements?: unknown[] };
      return Array.isArray(j.elements) ? j.elements : [];
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) console.warn('[discover-by-place] overpass fail', lastErr);
  return [];
}

function isOwnerWebsite(raw: string): boolean {
  const url = normalizeUrl(raw);
  if (!url || !/^https?:\/\//i.test(url)) return false;
  const host = domainFromUrl(url);
  if (!host || PORTAL_HOST.test(host)) return false;
  if (isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) return false;
  return true;
}

/**
 * Descubre webs (y emails OSM si existen) de alojamientos locales por lugar.
 */
export async function discoverOwnerSitesByPlace(opts?: {
  maxPlaces?: number;
  maxCandidates?: number;
  delayMs?: number;
}): Promise<PlaceDiscoveryResult> {
  const maxPlaces = opts?.maxPlaces ?? 10;
  const maxCandidates = opts?.maxCandidates ?? 40;
  const delayMs = opts?.delayMs ?? 1200;

  const places = pickPlacesForRun(maxPlaces);
  const candidateUrls: string[] = [];
  const emailsFromOsm: PlaceDiscoveryResult['emailsFromOsm'] = [];
  const leads: PlaceOsmLead[] = [];
  const seenHost = new Set<string>();
  let osmHits = 0;

  for (const place of places) {
    const elements = await fetchOverpass(overpassQueryForPlace(place));
    await sleep(delayMs);

    for (const raw of elements) {
      const el = raw as { tags?: Record<string, string> };
      const tags = el.tags || {};
      const website = String(tags.website || tags['contact:website'] || '').trim();
      const emailRaw = String(tags.email || tags['contact:email'] || '').trim();
      const name = String(tags.name || tags['name:es'] || '').trim();
      const tourism = String(tags.tourism || '');
      if (!website) continue;
      osmHits++;

      if (!isOwnerWebsite(website)) continue;
      const url = normalizeUrl(website);
      const host = domainFromUrl(url);
      if (!host || seenHost.has(host)) continue;

      // Preferir host vacacional; si no, aún aceptar si OSM lo etiquetó como tourism lodging
      if (!hostSuggestsVacation(url) && !/apartment|chalet|guest_house|camp_site/i.test(tourism)) {
        continue;
      }

      seenHost.add(host);
      let home = url;
      try {
        home = new URL(url).origin + '/';
      } catch {
        /* keep */
      }
      candidateUrls.push(home);
      leads.push({ place, name, website: home, email: emailRaw || undefined, tourism });

      if (emailRaw) {
        const email = normalizeEmail(emailRaw);
        if (isPlausiblePublicEmail(email)) {
          emailsFromOsm.push({ email, website: home, place, name });
        }
      }

      if (candidateUrls.length >= maxCandidates) {
        return { places, osmHits, candidateUrls, emailsFromOsm, leads };
      }
    }
  }

  return { places, osmHits, candidateUrls, emailsFromOsm, leads };
}
