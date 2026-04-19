import { normalizeRoomId } from '@/lib/db';

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
