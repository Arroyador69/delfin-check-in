/**
 * Autonomía: si la cola pending baja, inserta semillas ES vacacional
 * sin que el superadmin tenga que pegar URLs a mano.
 */

import { sql } from '@/lib/db';
import { isBlockedOutreachHost, normalizeUrl } from './extract-web';
import { SEED_SPAIN_AGENCY_URLS } from './seed-spain-agency-urls';
import { SEED_SPAIN_HOTEL_URLS } from './seed-spain-hotel-urls';
import { SEED_SPAIN_VACATION_URLS } from './seed-spain-vacation-urls';
import { hostSuggestsNonVacation } from './spain-vacation-filter';

/** Recámara: siempre webs pendientes para mañana / tarde / noche. */
const MIN_PENDING = 80;

async function insertSeedUrls(urls: readonly string[]): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  for (const raw of urls) {
    const url = normalizeUrl(raw);
    if (!url) {
      skipped++;
      continue;
    }
    if (isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) {
      skipped++;
      continue;
    }
    const r = await sql`
      INSERT INTO public_owner_lead_sources (url, status)
      VALUES (${url}, 'pending')
      ON CONFLICT (url) DO NOTHING
      RETURNING id
    `;
    if (r.rows[0]?.id) inserted++;
    else skipped++;
  }
  return { inserted, skipped };
}

export async function ensureSpainVacationSourceQueue(): Promise<{
  pendingBefore: number;
  inserted: number;
  skipped: number;
}> {
  const sourcesMeta = await sql`SELECT to_regclass('public.public_owner_lead_sources') AS reg`;
  if (!sourcesMeta.rows[0]?.reg) {
    return { pendingBefore: 0, inserted: 0, skipped: 0 };
  }

  const pending = await sql`
    SELECT COUNT(*)::int AS n
    FROM public_owner_lead_sources
    WHERE status = 'pending'
  `;
  const pendingBefore = Number(pending.rows[0]?.n || 0);
  if (pendingBefore >= MIN_PENDING) {
    return { pendingBefore, inserted: 0, skipped: 0 };
  }

  const a = await insertSeedUrls(SEED_SPAIN_VACATION_URLS);
  const c = await insertSeedUrls(SEED_SPAIN_AGENCY_URLS);
  const h = await insertSeedUrls(SEED_SPAIN_HOTEL_URLS);

  return {
    pendingBefore,
    inserted: a.inserted + c.inserted + h.inserted,
    skipped: a.skipped + c.skipped + h.skipped,
  };
}

/** Solo Flujo C: fuerza semillas de agencias + hoteles aunque pending ≥ MIN. */
export async function ensureSpainAgencySourceQueue(): Promise<{
  inserted: number;
  skipped: number;
}> {
  const sourcesMeta = await sql`SELECT to_regclass('public.public_owner_lead_sources') AS reg`;
  if (!sourcesMeta.rows[0]?.reg) {
    return { inserted: 0, skipped: 0 };
  }
  const agencies = await insertSeedUrls(SEED_SPAIN_AGENCY_URLS);
  const hotels = await insertSeedUrls(SEED_SPAIN_HOTEL_URLS);
  return {
    inserted: agencies.inserted + hotels.inserted,
    skipped: agencies.skipped + hotels.skipped,
  };
}

/**
 * Reabre fuentes sin email (done/failed con 0) para reintentar con filtro nuevo.
 * Así el cron no se queda sin pending aunque las semillas ya estén “gastadas”.
 * `minAgeHours`: en emergencia (cola 0) usar 0 para reintentar ya.
 */
export async function recycleEmptySources(
  limit = 60,
  minAgeHours = 12
): Promise<number> {
  const sourcesMeta = await sql`SELECT to_regclass('public.public_owner_lead_sources') AS reg`;
  if (!sourcesMeta.rows[0]?.reg) return 0;
  const hours = Math.max(0, minAgeHours);
  const r = await sql`
    WITH cte AS (
      SELECT id
      FROM public_owner_lead_sources
      WHERE status IN ('done', 'failed', 'blocked')
        AND COALESCE(emails_found, 0) = 0
        AND (
          last_scraped_at IS NULL
          OR last_scraped_at < NOW() - (${hours}::text || ' hours')::interval
        )
      ORDER BY last_scraped_at ASC NULLS FIRST
      LIMIT ${limit}
    )
    UPDATE public_owner_lead_sources s
    SET status = 'pending', last_error = NULL, updated_at = NOW()
    FROM cte
    WHERE s.id = cte.id
    RETURNING s.id
  `;
  return r.rows.length;
}
