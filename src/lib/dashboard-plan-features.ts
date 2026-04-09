/**
 * Resumen de ventajas del plan en el idioma activo (evita mezclar cadenas en español del API con la UI).
 */

export function localizedPlanFeatureSummary(
  t: (key: string, values?: Record<string, string | number | boolean>) => string,
  tenant: {
    plan_type?: string | null;
    billing_rooms?: number | null;
    config?: { lodgingType?: string } | null;
  }
): string {
  const pt = String(tenant?.plan_type || 'free');
  const br = Math.max(1, Number(tenant?.billing_rooms) || 1);
  const apartment = tenant?.config?.lodgingType === 'apartamentos';
  const unitSingular = apartment
    ? t('planFeatures.unit.apartmentSingular')
    : t('planFeatures.unit.roomSingular');
  const unitPlural = apartment
    ? t('planFeatures.unit.apartmentPlural')
    : t('planFeatures.unit.roomPlural');
  const unitsWord = br === 1 ? unitSingular : unitPlural;

  if (pt === 'free') {
    const first = apartment
      ? t('planFeatures.free.includedOneApartment')
      : t('planFeatures.free.includedOneRoom');
    return [first, t('planFeatures.free.basicSupport')].join(' • ');
  }

  const parts: string[] = [t('planFeatures.paid.subscription', { count: br, units: unitsWord })];

  if (pt === 'checkin') {
    parts.push(t('planFeatures.paid.mirIncluded'), t('planFeatures.paid.fullPms'));
  } else if (pt === 'standard') {
    parts.push(t('planFeatures.paid.noAds'), t('planFeatures.paid.mirIncluded'));
  } else if (pt === 'pro') {
    parts.push(t('planFeatures.paid.noAds'), t('planFeatures.paid.directBooking'));
  }

  return parts.join(' • ');
}
