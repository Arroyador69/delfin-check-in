import { sql } from '@vercel/postgres';

/**
 * Comprueba que cada room_id pertenezca al tenant, con la misma lógica flexible
 * que GET /api/tenant/rooms (lodging_id, tenant uuid como lodging, Lodging por id, Room.tenant_id, property_room_map).
 */
export async function validateRoomIdsBelongToTenant(
  tenantId: string,
  roomIds: string[]
): Promise<boolean> {
  if (roomIds.length === 0) return false;
  const unique = [...new Set(roomIds)];
  const res = await sql`
    SELECT COUNT(DISTINCT r.id)::int AS n
    FROM "Room" r
    CROSS JOIN tenants t
    WHERE t.id = ${tenantId}::uuid
      AND r.id::text = ANY(${unique})
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
  `;
  const n = res.rows[0]?.n ?? 0;
  return n === unique.length;
}
