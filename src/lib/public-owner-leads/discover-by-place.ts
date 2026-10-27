/**
 * Flujo B/C: descubrir webs de alojamiento ES vía OpenStreetMap (Overpass).
 * Preferimos `around:lat,lon` (rápido) frente a area=name (timeouts).
 * Normas: docs/growth/CAPTACION_FLUJO_B_POR_LUGARES.md
 */

import { isBlockedOutreachHost } from './blocked-hosts';
import { domainFromUrl, isPlausiblePublicEmail, normalizeEmail, normalizeUrl } from './emails';
import { sleep } from './fetch-html';
import { pickPlaceCoordsForRun, type PlaceCoord } from './places-coords-es';
import {
  hostSuggestsNonVacation,
  hostSuggestsVacation,
} from './spain-vacation-filter';

const UA =
  'DelfinCheckInPublicLeadsBot/1.0 (+https://delfincheckin.com; osm-place-discovery; contact=soporte@delfincheckin.com)';

const PORTAL_HOST =
  /casasruralesen|campingsde|barcelonacampings|alojamientorural|turismo-rural|escapada|booking|airbnb|kayak|rusticae|tripadvisor|fedcamping|campingred|misterplan|ruralgest|idealista|fotocasa|wordpress\.com|wix\.com|facebook|instagram|gob\.es|rediris|toprural|spain-holiday/i;

const OVERPASS_ENDPOINTS = [
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
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

/**
 * Queries muy ligeras (solo node + un tag tourism): Overpass público
 * aborta si pedimos nwr + regex + radio grande.
 */
function overpassQueriesAround(c: PlaceCoord): string[] {
  const r = Math.min(c.radiusM ?? 12000, 18000);
  // Una query nwr por zona (más cobertura; mirrors públicos a veces fallan).
  return [
    `
[out:json][timeout:18];
(
  nwr(around:${r},${c.lat},${c.lon})["tourism"~"^(apartment|guest_house|chalet|hostel|hotel|camp_site|motel|alpine_hut)$"]["website"];
  nwr(around:${r},${c.lat},${c.lon})["tourism"~"^(apartment|guest_house|chalet|hostel|hotel|camp_site)$"]["contact:website"];
);
out tags 35;
`.trim(),
  ];
}

async function fetchOverpass(query: string, timeoutMs = 12_000): Promise<unknown[]> {
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
        signal: AbortSignal.timeout(timeoutMs),
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
  if (lastErr) {
    console.warn(
      '[discover-by-place] overpass skip',
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    );
  }
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

function ingestElements(
  elements: unknown[],
  place: string,
  state: {
    osmHits: number;
    seenHost: Set<string>;
    candidateUrls: string[];
    emailsFromOsm: PlaceDiscoveryResult['emailsFromOsm'];
    leads: PlaceOsmLead[];
    maxCandidates: number;
  }
): boolean {
  for (const raw of elements) {
    try {
      const el = raw as { tags?: Record<string, string> };
      const tags = el.tags || {};
      const website = String(tags.website || tags['contact:website'] || '').trim();
      const emailRaw = String(tags.email || tags['contact:email'] || '').trim();
      const name = String(tags.name || tags['name:es'] || '').trim();
      const tourism = String(tags.tourism || '');
      if (!website) continue;
      state.osmHits++;

      if (!isOwnerWebsite(website)) continue;
      const url = normalizeUrl(website);
      const host = domainFromUrl(url);
      if (!host || state.seenHost.has(host)) continue;

      if (
        !hostSuggestsVacation(url) &&
        !/apartment|chalet|guest_house|camp_site|hotel|hostel|motel|alpine_hut/i.test(tourism)
      ) {
        continue;
      }

      state.seenHost.add(host);
      let home = url;
      try {
        home = new URL(url).origin + '/';
      } catch {
        /* keep */
      }
      state.candidateUrls.push(home);
      state.leads.push({ place, name, website: home, email: emailRaw || undefined, tourism });

      if (emailRaw) {
        const email = normalizeEmail(emailRaw);
        if (isPlausiblePublicEmail(email)) {
          state.emailsFromOsm.push({ email, website: home, place, name });
        }
      }

      if (state.candidateUrls.length >= state.maxCandidates) return true;
    } catch {
      /* elemento OSM raro */
    }
  }
  return false;
}

/**
 * Descubre webs (y emails OSM si existen) de alojamientos locales por lugar.
 */
export async function discoverOwnerSitesByPlace(opts?: {
  maxPlaces?: number;
  maxCandidates?: number;
  delayMs?: number;
  /** Tope duro de wall-clock (cron ~300s: usar 60–90s para OSM). */
  deadlineMs?: number;
  /** 0 mañana / 1 tarde / 2 noche → provincias distintas automáticamente. */
  waveOffset?: number;
}): Promise<PlaceDiscoveryResult> {
  const maxPlaces = opts?.maxPlaces ?? 10;
  const maxCandidates = opts?.maxCandidates ?? 40;
  const delayMs = opts?.delayMs ?? 400;
  const deadlineMs = opts?.deadlineMs ?? 90_000;
  const waveOffset = opts?.waveOffset ?? 0;
  const started = Date.now();

  const coords = pickPlaceCoordsForRun(maxPlaces, 0, waveOffset);
  const places = coords.map((c) => c.name);
  const state = {
    osmHits: 0,
    seenHost: new Set<string>(),
    candidateUrls: [] as string[],
    emailsFromOsm: [] as PlaceDiscoveryResult['emailsFromOsm'],
    leads: [] as PlaceOsmLead[],
    maxCandidates,
  };

  for (const c of coords) {
    if (Date.now() - started > deadlineMs) break;
    for (const q of overpassQueriesAround(c)) {
      if (Date.now() - started > deadlineMs) break;
      let elements: unknown[] = [];
      try {
        elements = await fetchOverpass(q, 11_000);
      } catch {
        elements = [];
      }
      await sleep(Math.min(delayMs, 250));
      if (ingestElements(elements, c.name, state)) {
        return {
          places,
          osmHits: state.osmHits,
          candidateUrls: state.candidateUrls,
          emailsFromOsm: state.emailsFromOsm,
          leads: state.leads,
        };
      }
    }
  }

  return {
    places,
    osmHits: state.osmHits,
    candidateUrls: state.candidateUrls,
    emailsFromOsm: state.emailsFromOsm,
    leads: state.leads,
  };
}
