/**
 * Autonomía: si la cola pending baja, inserta semillas ES vacacional
 * sin que el superadmin tenga que pegar URLs a mano.
 */

import { sql } from '@/lib/db';
import { isBlockedOutreachHost, normalizeUrl } from './extract-web';
import { SEED_SPAIN_VACATION_URLS } from './seed-spain-vacation-urls';
import { hostSuggestsNonVacation } from './spain-vacation-filter';

/** Recámara: siempre webs pendientes para mañana 09:00 y oleada 15:00. */
const MIN_PENDING = 40;

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

  let inserted = 0;
  let skipped = 0;
  for (const raw of SEED_SPAIN_VACATION_URLS) {
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

  return { pendingBefore, inserted, skipped };
}
