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

/** Mismo orden y criterio que slots / limpieza: Room por lodging, ORDER BY id::text. */
export type TenantRoomContext = {
  orderedRoomIds: string[];
  roomNameById: Map<string, string>;
};

export async function getTenantRoomContext(tenantId: string): Promise<TenantRoomContext> {
  const empty = (): TenantRoomContext => ({
    orderedRoomIds: [],
    roomNameById: new Map(),
  });
  const tenant = await getTenantById(tenantId);
  if (!tenant) return empty();
  const lodgingId =
    tenant.lodging_id && String(tenant.lodging_id).trim() !== ''
      ? String(tenant.lodging_id)
      : String(tenant.id);
  try {
    const r = await sql`
      SELECT id::text AS id, name
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
      ORDER BY id::text ASC
    `;
    const orderedRoomIds: string[] = [];
    const roomNameById = new Map<string, string>();
    for (const row of r.rows as { id: string; name: string | null }[]) {
      orderedRoomIds.push(row.id);
      roomNameById.set(row.id, row.name ?? '');
    }
    return { orderedRoomIds, roomNameById };
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
 */
export function resolveReservationRoomIdToCanonicalRoomId(
  resRoomId: unknown,
  orderedRoomIds: string[]
): string | null {
  const rid = String(resRoomId ?? '').trim();
  if (!rid) return null;
  if (orderedRoomIds.includes(rid)) return rid;
  if (/^\d+$/.test(rid)) {
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
