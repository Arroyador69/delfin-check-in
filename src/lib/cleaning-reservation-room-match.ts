import { sql } from '@vercel/postgres';
import { normalizeRoomId } from '@/lib/db';
import { getTenantById } from '@/lib/tenant';

/**
 * Número “humano” de la habitación en el nombre (p. ej. "Habitación 2" → "2").
 * No confundir con el índice por orden de UUID en BD.
 */
export function extractPrimaryRoomNumberFromName(name: string | null | undefined): string | null {
  if (name == null || !String(name).trim()) return null;
  const s = String(name).trim();
  const m1 = s.match(
    /(?:habitaci[oó]n|hab\.?|room|apartamento|apart|apto\.?|apt\.?|suite|estudio|studio)\s*[:\s#·\-]*\s*(\d{1,3})\b/i
  );
  if (m1) return String(parseInt(m1[1], 10));
  const only = s.match(/^\s*(\d{1,3})\s*$/);
  if (only) return String(parseInt(only[1], 10));
  return null;
}

/**
 * Mapa dígito → id de Room solo si ninguna otra habitación reclama el mismo dígito por nombre.
 */
export function buildUniqueDisplayNumberToRoomId(
  rooms: { id: string; name: string | null }[]
): Map<string, string> {
  const numToIds = new Map<string, string[]>();
  for (const row of rooms) {
    const num = extractPrimaryRoomNumberFromName(row.name);
    if (!num) continue;
    if (!numToIds.has(num)) numToIds.set(num, []);
    numToIds.get(num)!.push(row.id);
  }
  const out = new Map<string, string>();
  for (const [num, ids] of numToIds) {
    if (ids.length === 1) out.set(num, ids[0]!);
  }
  return out;
}

async function fetchRoomsForLodging(
  lodgingId: string
): Promise<{ id: string; name: string | null }[]> {
  const r = await sql`
    SELECT id::text AS id, name
    FROM "Room"
    WHERE "lodgingId" = ${lodgingId}
    ORDER BY id::text ASC
  `;
  return r.rows as { id: string; name: string | null }[];
}

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
    const roomRows = await fetchRoomsForLodging(lodgingId);
    const ordered = roomRows.map((row) => row.id);
    const want = new Set(linkRoomIds.map((x) => String(x).trim()));
    const byDisplay = buildUniqueDisplayNumberToRoomId(roomRows);
    for (let i = 0; i < ordered.length; i++) {
      if (!want.has(ordered[i])) continue;
      out.add(String(i + 1));
    }
    for (const [num, rid] of byDisplay) {
      if (want.has(rid)) out.add(num);
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

  let roomRows: { id: string; name: string | null }[] = [];
  try {
    roomRows = await fetchRoomsForLodging(lodgingId);
  } catch {
    seedOnlyDefaults();
    return result;
  }

  const ordered = roomRows.map((row) => row.id);
  const byDisplay = buildUniqueDisplayNumberToRoomId(roomRows);

  for (const roomId of trimmed) {
    const acceptable = new Set<string>();
    addDefaultRoomIdVariants(roomId, acceptable);
    const idx = ordered.indexOf(roomId);
    if (idx >= 0) {
      acceptable.add(String(idx + 1));
    }
    for (const [num, rid] of byDisplay) {
      if (rid === roomId) acceptable.add(num);
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

/** Mismo orden y criterio que slots / limpieza: Room por lodging, ORDER BY id::text. */
export type TenantRoomContext = {
  orderedRoomIds: string[];
  roomNameById: Map<string, string>;
  /** room_id "2" en reserva → UUID de "Habitación 2" si el nombre lo permite sin ambigüedad */
  displayNumberToRoomId: Map<string, string>;
};

export async function getTenantRoomContext(tenantId: string): Promise<TenantRoomContext> {
  const empty = (): TenantRoomContext => ({
    orderedRoomIds: [],
    roomNameById: new Map(),
    displayNumberToRoomId: new Map(),
  });
  const tenant = await getTenantById(tenantId);
  if (!tenant) return empty();
  const lodgingId =
    tenant.lodging_id && String(tenant.lodging_id).trim() !== ''
      ? String(tenant.lodging_id)
      : String(tenant.id);
  try {
    const rows = await fetchRoomsForLodging(lodgingId);
    const orderedRoomIds: string[] = [];
    const roomNameById = new Map<string, string>();
    for (const row of rows) {
      orderedRoomIds.push(row.id);
      roomNameById.set(row.id, row.name ?? '');
    }
    const displayNumberToRoomId = buildUniqueDisplayNumberToRoomId(rows);
    return { orderedRoomIds, roomNameById, displayNumberToRoomId };
  } catch {
    return empty();
  }
}

export async function getOrderedRoomIdsForTenant(tenantId: string): Promise<string[]> {
  const ctx = await getTenantRoomContext(tenantId);
  return ctx.orderedRoomIds;
}

/**
 * Convierte `reservations.room_id` (UUID, dígito legacy, etc.) al id canónico de fila Room.
 * Prioriza el número del nombre ("Habitación 2") frente al índice por orden de UUID.
 */
export function resolveReservationRoomIdToCanonicalRoomId(
  resRoomId: unknown,
  orderedRoomIds: string[],
  displayNumberToRoomId?: Map<string, string>
): string | null {
  const rid = String(resRoomId ?? '').trim();
  if (!rid) return null;
  if (orderedRoomIds.includes(rid)) return rid;
  if (/^\d+$/.test(rid)) {
    const byName = displayNumberToRoomId?.get(rid);
    if (byName) return byName;
    const idx = parseInt(rid, 10) - 1;
    if (idx >= 0 && idx < orderedRoomIds.length) return orderedRoomIds[idx]!;
  }
  const n = normalizeRoomId(rid);
  if (orderedRoomIds.includes(n)) return n;
  return null;
}

/** Expande a todos los alias posibles en SQL para todas las habitaciones del alojamiento. */
export async function expandRoomIdsForAllTenantRooms(tenantId: string): Promise<string[]> {
  const ordered = await getOrderedRoomIdsForTenant(tenantId);
  if (ordered.length === 0) return [];
  return expandRoomIdsForReservationQuery(tenantId, ordered);
}

/**
 * Valores posibles de `reservations.room_id` para la habitación mapeada a una propiedad
 * (mismo criterio que enlaces de limpieza y calendario).
 */
export async function getAcceptableReservationIdsArrayForProperty(
  tenantId: string,
  propertyId: number
): Promise<string[]> {
  const row = await sql`
    SELECT room_id::text AS room_id
    FROM property_room_map
    WHERE tenant_id = ${tenantId}::uuid AND property_id = ${propertyId}
    LIMIT 1
  `;
  const canon = String(row.rows[0]?.room_id ?? '').trim();
  if (!canon) return [];
  const m = await getAcceptableReservationRoomIdsByLinkedRoom(tenantId, [canon]);
  return [...(m.get(canon) ?? new Set())];
}
