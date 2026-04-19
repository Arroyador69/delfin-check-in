import { sql } from '@vercel/postgres';
import { normalizeRoomId } from '@/lib/db';
import { getTenantById } from '@/lib/tenant';

/**
 * Los enlaces de limpieza guardan `Room.id` tal cual; en `reservations.room_id`
 * puede existir la misma cadena, una variante legacy o el resultado antiguo de
 * `normalizeRoomId`. Expandimos para que el `WHERE room_id = ANY(...)` sea robusto.
 */
export function expandRoomIdsForReservationFilter(roomIds: string[]): string[] {
  const out = new Set<string>();
  for (const raw of roomIds) {
    const id = String(raw ?? '').trim();
    if (!id) continue;
    out.add(id);
    const n = normalizeRoomId(id);
    if (n) out.add(n);
  }
  return [...out];
}

/**
 * Incluye alias legacy "1".."n" según el orden de habitaciones del alojamiento,
 * para reservas antiguas guardadas con dígito en lugar del UUID de Room.
 */
export async function expandRoomIdsForReservationQuery(
  tenantId: string,
  linkRoomIds: string[]
): Promise<string[]> {
  const base = expandRoomIdsForReservationFilter(linkRoomIds);
  const out = new Set(base);

  const tenant = await getTenantById(tenantId);
  if (!tenant) return [...out];

  const lodgingId =
    tenant.lodging_id && String(tenant.lodging_id).trim() !== ''
      ? String(tenant.lodging_id)
      : String(tenant.id);

  try {
    const r = await sql`
      SELECT id::text AS id
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
      ORDER BY id::text ASC
    `;
    const ordered = (r.rows as { id: string }[]).map((row) => row.id);
    const want = new Set(linkRoomIds.map((x) => String(x).trim()));
    for (let i = 0; i < ordered.length; i++) {
      if (!want.has(ordered[i])) continue;
      out.add(String(i + 1));
    }
  } catch {
    /* sin tabla Room o columna distinta */
  }

  return [...out];
}

function addDefaultRoomIdVariants(roomId: string, into: Set<string>): void {
  const id = String(roomId ?? '').trim();
  if (!id) return;
  into.add(id);
  const n = normalizeRoomId(id);
  if (n) into.add(n);
}

/**
 * Para cada habitación del enlace (UUID), conjunto de valores que puede tener
 * `reservations.room_id` y seguir siendo esa habitación (UUID, alias legacy "1".."n", etc.).
 * Sin esto, las reservas guardadas como dígito nunca coinciden con el filtro por UUID.
 */
export async function getAcceptableReservationRoomIdsByLinkedRoom(
  tenantId: string,
  linkRoomIds: string[]
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  const trimmed = [...new Set(linkRoomIds.map((x) => String(x).trim()).filter(Boolean))];

  const tenant = await getTenantById(tenantId);

  const seedOnlyDefaults = () => {
    for (const id of trimmed) {
      const s = new Set<string>();
      addDefaultRoomIdVariants(id, s);
      result.set(id, s);
    }
  };

  if (!tenant) {
    seedOnlyDefaults();
    return result;
  }

  const lodgingId =
    tenant.lodging_id && String(tenant.lodging_id).trim() !== ''
      ? String(tenant.lodging_id)
      : String(tenant.id);

  let ordered: string[] = [];
  try {
    const r = await sql`
      SELECT id::text AS id
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
      ORDER BY id::text ASC
    `;
    ordered = (r.rows as { id: string }[]).map((row) => row.id);
  } catch {
    seedOnlyDefaults();
    return result;
  }

  for (const roomId of trimmed) {
    const acceptable = new Set<string>();
    addDefaultRoomIdVariants(roomId, acceptable);
    const idx = ordered.indexOf(roomId);
    if (idx >= 0) {
      acceptable.add(String(idx + 1));
    }
    result.set(roomId, acceptable);
  }

  return result;
}

/** ¿Esta fila de reserva corresponde a la habitación enlazada `roomId`? */
export function reservationRowMatchesLinkedRoom(
  reservationRoomId: unknown,
  acceptableIds: Set<string>
): boolean {
  const rid = String(reservationRoomId ?? '').trim();
  if (!rid) return false;
  if (acceptableIds.has(rid)) return true;
  const n = normalizeRoomId(rid);
  return acceptableIds.has(n);
}
