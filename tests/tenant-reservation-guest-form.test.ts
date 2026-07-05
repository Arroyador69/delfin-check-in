import { describe, expect, it } from 'vitest';
import {
  UNASSIGNED_RESERVATION_ROOM_ID,
  isUnassignedReservationRoomId,
} from '@/lib/reservation-from-guest-registration';

describe('reservation-from-guest-registration room placeholder', () => {
  it('detecta room_id sin asignar del formulario', () => {
    expect(isUnassignedReservationRoomId(UNASSIGNED_RESERVATION_ROOM_ID)).toBe(true);
    expect(isUnassignedReservationRoomId('')).toBe(true);
    expect(isUnassignedReservationRoomId('room-uuid-1')).toBe(false);
  });
});
