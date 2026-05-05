import { sql } from '@vercel/postgres';

let roomTenantIdColumnExistsCache: boolean | null = null;

async function hasRoomTenantIdColumn(): Promise<boolean> {
  if (roomTenantIdColumnExistsCache !== null) return roomTenantIdColumnExistsCache;
  try {
    const meta = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Room'
          AND column_name = 'tenant_id'
      ) AS exists
    `;
    roomTenantIdColumnExistsCache = Boolean(meta.rows[0]?.exists);
  } catch {
    roomTenantIdColumnExistsCache = false;
  }
  return roomTenantIdColumnExistsCache;
}

/**
 * Devuelve el número de unidades (habitaciones/apartamentos) del tenant.
 * Usa varios fallbacks porque en algunas BD antiguas `Room.lodgingId` no coincide con `tenants.lodging_id`.
 */
export async function getRoomsForTenant(tenantId: string): Promise<Array<{ id: string; name: string }>> {
  // Primario: Room.lodgingId == tenants.id OR == tenants.lodging_id (si existe)
  let result = await sql`
    SELECT DISTINCT r.id, r.name
    FROM "Room" r
    INNER JOIN tenants t ON t.id = ${tenantId}::uuid
    WHERE r."lodgingId"::text = t.id::text
       OR (
         t.lodging_id IS NOT NULL
         AND BTRIM(t.lodging_id::text) <> ''
         AND r."lodgingId"::text = BTRIM(t.lodging_id::text)
       )
    ORDER BY r.id::text ASC
  `;

  if (result.rows.length === 0) {
    const attempts: Array<{ label: string; run: () => Promise<{ rows: { id: unknown; name: string }[] }> }> = [
      {
        label: 'lodgingId_eq_tenantId',
        run: () => sql`
          SELECT id, name
          FROM "Room"
          WHERE "lodgingId"::text = ${tenantId}
          ORDER BY id::text ASC
        `,
      },
      {
        label: 'via_Lodging_id',
        run: () => sql`
          SELECT DISTINCT r.id, r.name
          FROM "Room" r
          INNER JOIN "Lodging" l ON r."lodgingId"::text = l.id::text
          WHERE l.id::text = ${tenantId}
          ORDER BY r.id::text ASC
        `,
      },
      {
        label: 'property_room_map',
        run: () => sql`
          SELECT DISTINCT r.id, r.name
          FROM "Room" r
          INNER JOIN property_room_map m
            ON m.tenant_id = ${tenantId}::uuid
            AND m.room_id::text = r.id::text
          ORDER BY r.id::text ASC
        `,
      },
    ];

    if (await hasRoomTenantIdColumn()) {
      attempts.push({
        label: 'Room.tenant_id',
        run: () => sql`
          SELECT id, name
          FROM "Room"
          WHERE tenant_id = ${tenantId}::uuid
          ORDER BY id::text ASC
        `,
      });
    }

    for (const { label, run } of attempts) {
      try {
        const r = await run();
        if (r.rows.length > 0) {
          console.warn(`⚠️ [getRoomsForTenant] Fallback "${label}" → ${r.rows.length} unidad(es)`);
          result = r as any;
          break;
        }
      } catch (e: unknown) {
        const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: string }).code) : ''
        const missingColumn =
          code === '42703' ||
          /column .* does not exist/i.test(e instanceof Error ? e.message : String(e))
        if (!missingColumn) {
          console.warn(`⚠️ [getRoomsForTenant] Fallback "${label}" no aplicable:`, e);
        }
      }
    }
  }

  return result.rows.map((row: any) => ({
    id: String(row.id),
    name: String(row.name || '').trim() || String(row.id),
  }));
}

