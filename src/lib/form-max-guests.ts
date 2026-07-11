import { sql } from '@vercel/postgres';

/** Límite oficial MIR por comunicación (alta parte hospedaje). */
export const MIR_MAX_PERSONAS_PER_COMUNICACION = 50;

export const DEFAULT_MAX_GUESTS_PER_PROPERTY = 2;

export function clampMaxGuests(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_MAX_GUESTS_PER_PROPERTY;
  return Math.max(1, Math.min(MIR_MAX_PERSONAS_PER_COMUNICACION, Math.floor(n)));
}

/**
 * Resuelve max_guests para el formulario público según unidad (room) o propiedad.
 */
export async function resolveMaxGuestsForTravelerForm(
  tenantId: string,
  options?: { roomId?: string | null; propertyId?: string | null }
): Promise<number> {
  const roomId = options?.roomId?.trim() || '';
  const propertyId = options?.propertyId?.trim() || '';

  try {
    if (roomId) {
      const byRoom = await sql`
        SELECT tp.max_guests
        FROM property_room_map prm
        JOIN tenant_properties tp ON tp.id = prm.property_id AND tp.tenant_id = prm.tenant_id
        WHERE prm.tenant_id = ${tenantId}::uuid
          AND prm.room_id::text = ${roomId}
        LIMIT 1
      `;
      if (byRoom.rows.length > 0 && byRoom.rows[0].max_guests != null) {
        return clampMaxGuests(byRoom.rows[0].max_guests);
      }
    }

    if (propertyId && /^\d+$/.test(propertyId)) {
      const byProp = await sql`
        SELECT max_guests
        FROM tenant_properties
        WHERE tenant_id = ${tenantId}::uuid
          AND id = ${Number(propertyId)}
        LIMIT 1
      `;
      if (byProp.rows.length > 0 && byProp.rows[0].max_guests != null) {
        return clampMaxGuests(byProp.rows[0].max_guests);
      }
    }

    const fallback = await sql`
      SELECT max_guests
      FROM tenant_properties
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY id ASC
      LIMIT 1
    `;
    if (fallback.rows.length > 0 && fallback.rows[0].max_guests != null) {
      return clampMaxGuests(fallback.rows[0].max_guests);
    }
  } catch (e) {
    console.warn('⚠️ resolveMaxGuestsForTravelerForm:', e);
  }

  return DEFAULT_MAX_GUESTS_PER_PROPERTY;
}

/**
 * Crea o actualiza tenant_properties enlazadas a rooms tras onboarding / alta de unidades.
 */
export async function ensureTenantPropertiesForRooms(
  tenantId: string,
  rooms: Array<{ id: string; name: string; max_guests?: number }>
): Promise<void> {
  if (!rooms.length) return;

  for (const room of rooms) {
    const roomId = String(room.id).trim();
    const name = String(room.name || '').trim() || `Unidad ${roomId}`;
    const maxGuests = clampMaxGuests(room.max_guests ?? DEFAULT_MAX_GUESTS_PER_PROPERTY);

    try {
      const existing = await sql`
        SELECT prm.property_id
        FROM property_room_map prm
        WHERE prm.tenant_id = ${tenantId}::uuid
          AND prm.room_id::text = ${roomId}
        LIMIT 1
      `;

      if (existing.rows.length > 0) {
        const propertyId = existing.rows[0].property_id;
        await sql`
          UPDATE tenant_properties
          SET
            property_name = ${name},
            max_guests = ${maxGuests},
            included_guests = LEAST(COALESCE(included_guests, 2), ${maxGuests}),
            updated_at = NOW()
          WHERE id = ${propertyId}
            AND tenant_id = ${tenantId}::uuid
        `;
        continue;
      }

      const inserted = await sql`
        INSERT INTO tenant_properties (
          tenant_id, property_name, description, photos, max_guests, included_guests,
          extra_guest_fee, bedrooms, bathrooms, amenities, base_price, cleaning_fee,
          security_deposit, minimum_nights, maximum_nights, availability_rules,
          is_active, created_at, updated_at
        ) VALUES (
          ${tenantId}::uuid, ${name}, '', '[]'::jsonb, ${maxGuests},
          ${Math.min(2, maxGuests)}, 0, 1, 1, '[]'::jsonb, 50, 0, 0, 1, 30, '{}'::jsonb,
          true, NOW(), NOW()
        )
        RETURNING id
      `;
      const propertyId = inserted.rows[0]?.id;
      if (!propertyId) continue;

      await sql`
        INSERT INTO property_room_map (tenant_id, property_id, room_id, created_at, updated_at)
        VALUES (${tenantId}::uuid, ${propertyId}, ${roomId}, NOW(), NOW())
        ON CONFLICT (tenant_id, property_id) DO UPDATE
        SET room_id = EXCLUDED.room_id, updated_at = NOW()
      `;
    } catch (e) {
      console.warn(`⚠️ ensureTenantPropertiesForRooms room=${roomId}:`, e);
    }
  }
}
