#!/usr/bin/env npx tsx
/**
 * Mide volumen real: OSM por muchos lugares ES (no solo 17 semillas).
 * Las ~300k VUT no tienen todas web+email público; aquí contamos candidatos OSM.
 *
 *   cd delfin-check-in
 *   npx tsx scripts/public-owner-leads/discover-volume-es.ts --max-places 40
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

import { discoverOwnerSitesByPlace } from '../../src/lib/public-owner-leads/discover-by-place';
import { SPAIN_PLACE_COORDS } from '../../src/lib/public-owner-leads/places-coords-es';
import { SPAIN_RURAL_PLACES } from '../../src/lib/public-owner-leads/places-es';
import { SEED_SPAIN_AGENCY_URLS } from '../../src/lib/public-owner-leads/seed-spain-agency-urls';
import { SEED_SPAIN_VACATION_URLS } from '../../src/lib/public-owner-leads/seed-spain-vacation-urls';

function argNum(name: string, def: number): number {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) {
    const n = Number(process.argv[i + 1]);
    if (Number.isFinite(n)) return n;
  }
  return def;
}

async function main() {
  const maxPlaces = argNum('--max-places', 30);
  const maxCandidates = argNum('--max-candidates', 200);

  console.log('[volume] lugares nombre', SPAIN_RURAL_PLACES.length);
  console.log('[volume] lugares coords OSM', SPAIN_PLACE_COORDS.length);
  console.log('[volume] semillas dueños', SEED_SPAIN_VACATION_URLS.length);
  console.log('[volume] semillas agencias', SEED_SPAIN_AGENCY_URLS.length);
  console.log('[volume] OSM run', { maxPlaces, maxCandidates });

  const disc = await discoverOwnerSitesByPlace({
    maxPlaces,
    maxCandidates,
    delayMs: 500,
    deadlineMs: 240_000,
  });

  console.log(
    JSON.stringify(
      {
        placesQueried: disc.places,
        osmHitsWithWebsite: disc.osmHits,
        uniqueOwnerWebsites: disc.candidateUrls.length,
        emailsDirectFromOsm: disc.emailsFromOsm.length,
        sampleWebsites: disc.candidateUrls.slice(0, 25),
        sampleOsmEmails: disc.emailsFromOsm.slice(0, 15).map((x) => x.email),
        note:
          'Cada oleada cron rota lugares distintos. Con ~' +
          SPAIN_RURAL_PLACES.length +
          ' sitios × varios tourism OSM → cientos/miles de webs a lo largo de semanas. ' +
          '300k VUT ≠ 300k emails: la mayoría solo está en Airbnb/Booking sin web propia.',
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
