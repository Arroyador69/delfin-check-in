import { describe, expect, it } from 'vitest';
import {
  extractPolarSubscribedRooms,
  resolveSuperadminRoomsLimit,
} from '@/lib/tenant-plan-billing';

describe('resolveSuperadminRoomsLimit', () => {
  it('plan free muestra límite fijo (1)', () => {
    expect(
      resolveSuperadminRoomsLimit({ max_rooms_effective: 1, billing_rooms: 1 })
    ).toBe(1);
  });

  it('plan pago con max_rooms=-1 usa billing_rooms, no infinito', () => {
    expect(
      resolveSuperadminRoomsLimit({ max_rooms_effective: -1, billing_rooms: 1 })
    ).toBe(1);
    expect(
      resolveSuperadminRoomsLimit({ max_rooms_effective: -1, billing_rooms: 3 })
    ).toBe(3);
  });

  it('prioriza asientos Polar del checkout si son mayores', () => {
    expect(
      resolveSuperadminRoomsLimit(
        { max_rooms_effective: -1, billing_rooms: 1 },
        { polar_checkout_context: { rooms: 5, plan: 'checkin' } }
      )
    ).toBe(5);
  });
});

describe('extractPolarSubscribedRooms', () => {
  it('lee rooms o seats', () => {
    expect(extractPolarSubscribedRooms({ rooms: 2 })).toBe(2);
    expect(extractPolarSubscribedRooms({ seats: 4 })).toBe(4);
    expect(extractPolarSubscribedRooms(null)).toBeNull();
  });
});
