import { sql } from '@vercel/postgres';

/**
 * Garantiza una fila en cleaning_config por habitación (valores por defecto de la tabla si es nueva).
 * No modifica filas ya existentes. Así los enlaces públicos y el iCal usan el mismo horario por habitación que en ajustes.
 */
export async function ensureCleaningConfigForRoomIds(tenantId: string, roomIds: string[]): Promise<void> {
  const unique = [...new Set(roomIds.map((x) => String(x)).filter(Boolean))];
  if (unique.length === 0) return;

  for (const rid of unique) {
    await sql`
      INSERT INTO cleaning_config (tenant_id, room_id)
      VALUES (${tenantId}::uuid, ${rid})
      ON CONFLICT (tenant_id, room_id) DO NOTHING
    `;
  }
}
