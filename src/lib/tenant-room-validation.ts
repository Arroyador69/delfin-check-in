import { sql } from '@vercel/postgres';

/**
 * Algunas BD tienen "Room".tenant_id y otras no (solo lodgingId + property_room_map).
 * Cacheamos el resultado para no consultar information_schema en cada request.
 */
let roomTableHasTenantId: boolean | null = null;

async function resolveRoomHasTenantIdColumn(): Promise<boolean> {
  if (roomTableHasTenantId !== null) return roomTableHasTenantId;
  try {
    const meta = await sql`
      SELECT 1 AS ok
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Room'
        AND column_name = 'tenant_id'
      LIMIT 1
    `;
    roomTableHasTenantId = meta.rows.length > 0;
  } catch {
    roomTableHasTenantId = false;
  }
  return roomTableHasTenantId;
}

/**
 * Comprueba que cada room_id pertenezca al tenant, con la misma lógica flexible
 * que GET /api/tenant/rooms (lodging_id, tenant uuid como lodging, Lodging por id, Room.tenant_id si existe, property_room_map).
 */
export async function validateRoomIdsBelongToTenant(
  tenantId: string,
  roomIds: string[]
): Promise<boolean> {
  if (roomIds.length === 0) return false;
  const unique = [...new Set(roomIds)];
  const hasRoomTenantId = await resolveRoomHasTenantIdColumn();

  const res = hasRoomTenantId
    ? await sql`
    SELECT COUNT(DISTINCT r.id)::int AS n
    FROM "Room" r
    CROSS JOIN tenants t
    WHERE t.id = ${tenantId}::uuid
      AND r.id::text = ANY(${unique as any})
      AND (
        r."lodgingId"::text = t.id::text
        OR (
          t.lodging_id IS NOT NULL
          AND BTRIM(t.lodging_id::text) <> ''
          AND r."lodgingId"::text = BTRIM(t.lodging_id::text)
        )
        OR r."lodgingId"::text = ${tenantId}
        OR EXISTS (
          SELECT 1
          FROM "Lodging" l
          WHERE r."lodgingId"::text = l.id::text
            AND l.id::text = ${tenantId}
        )
        OR r.tenant_id = ${tenantId}::uuid
        OR EXISTS (
          SELECT 1
          FROM property_room_map m
          WHERE m.tenant_id = ${tenantId}::uuid
            AND m.room_id::text = r.id::text
        )
      )
  `
    : await sql`
    SELECT COUNT(DISTINCT r.id)::int AS n
    FROM "Room" r
    CROSS JOIN tenants t
    WHERE t.id = ${tenantId}::uuid
      AND r.id::text = ANY(${unique as any})
      AND (
        r."lodgingId"::text = t.id::text
        OR (
          t.lodging_id IS NOT NULL
          AND BTRIM(t.lodging_id::text) <> ''
          AND r."lodgingId"::text = BTRIM(t.lodging_id::text)
        )
        OR r."lodgingId"::text = ${tenantId}
        OR EXISTS (
          SELECT 1
          FROM "Lodging" l
          WHERE r."lodgingId"::text = l.id::text
            AND l.id::text = ${tenantId}
        )
        OR EXISTS (
          SELECT 1
          FROM property_room_map m
          WHERE m.tenant_id = ${tenantId}::uuid
            AND m.room_id::text = r.id::text
        )
      )
  `;

  const n = res.rows[0]?.n ?? 0;
  return n === unique.length;
}

/** Para tests o migraciones: fuerza relectura de columnas en el próximo validate. */
export function resetRoomTenantIdColumnCache(): void {
  roomTableHasTenantId = null;
}
