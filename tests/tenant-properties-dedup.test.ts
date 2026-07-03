import { describe, expect, it } from 'vitest';
import {
  dedupeTenantPropertiesList,
  findDuplicateStubPropertyIds,
  normalizePropertyName,
  propertyCompletenessScore,
} from '@/lib/tenant-properties-dedup';
import {
  supportTicketIdFromNotificationLink,
  tenantNotificationMobileRoute,
} from '@/lib/onboarding-notification-routes';

describe('tenant-properties-dedup', () => {
  it('prefiere ficha real con fotos frente a placeholder €50', () => {
    const list = dedupeTenantPropertiesList([
      {
        id: null,
        property_name: 'Habitación 1',
        base_price: 50,
        is_placeholder: true,
        room_id: 'room-1',
      },
      {
        id: 10,
        property_name: 'Habitación 1',
        base_price: 40,
        photos: ['https://example.com/a.jpg'],
        room_id: 'room-1',
      },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(10);
  });

  it('elimina stub en BD duplicado por nombre', () => {
    const props = [
      { id: 1, property_name: 'Habitación 5', base_price: 50, photos: [] },
      {
        id: 2,
        property_name: 'Habitación 5',
        base_price: 40,
        photos: ['https://example.com/b.jpg'],
        room_id: 'r5',
      },
    ];
    expect(findDuplicateStubPropertyIds(props)).toEqual([1]);
    const list = dedupeTenantPropertiesList(props);
    expect(list.map((p) => p.id)).toEqual([2]);
  });

  it('normaliza nombres para comparar', () => {
    expect(normalizePropertyName('  Habitación  1 ')).toBe('habitacion 1');
  });

  it('puntúa mayor la ficha con fotos y precio custom', () => {
    const stub = { id: 1, property_name: 'A', base_price: 50, photos: [] };
    const real = { id: 2, property_name: 'A', base_price: 40, photos: ['x'] };
    expect(propertyCompletenessScore(real)).toBeGreaterThan(propertyCompletenessScore(stub));
  });
});

describe('support notification routes', () => {
  it('extrae ticket id del link', () => {
    expect(
      supportTicketIdFromNotificationLink('/settings/support?ticket=abc-123-def')
    ).toBe('abc-123-def');
  });

  it('enruta soporte al ticket concreto en móvil', () => {
    expect(
      tenantNotificationMobileRoute({
        id: 'n1',
        type: 'support_reply',
        link: '/settings/support?ticket=abc-123',
      })
    ).toBe('/(app)/settings/support?ticket=abc-123');
  });
});
