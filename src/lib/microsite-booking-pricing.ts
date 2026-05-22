import { sql } from '@/lib/db';
import { nightsBetweenYmd } from '@/lib/date-ymd';
import { ensureAvailabilityPriceColumn } from '@/lib/microsite-property-pricing';

export type LodgingSumResult = {
  baseAmount: number;
  nights: number;
};

/** Suma precios por noche (calendario microsite) o tarifa base × noches. */
export async function sumLodgingForStay(
  propertyId: number,
  checkIn: string,
  checkOut: string,
  basePrice: number
): Promise<LodgingSumResult> {
  const nights = nightsBetweenYmd(checkIn, checkOut);
  let baseAmount = basePrice * nights;
  if (nights === 0) return { baseAmount: 0, nights: 0 };

  try {
    await ensureAvailabilityPriceColumn();
    const daily = await sql`
      WITH nights AS (
        SELECT generate_series(${checkIn}::date, (${checkOut}::date - INTERVAL '1 day'), '1 day')::date AS d
      )
      SELECT
        COALESCE(SUM(COALESCE(pa.price, pa.price_override, ${basePrice}::decimal(10,2))), 0)::decimal(12,2) AS base_amount,
        COUNT(*)::int AS night_count
      FROM nights n
      LEFT JOIN property_availability pa
        ON pa.property_id = ${propertyId}::int
       AND pa.date = n.d
    `;
    const row = daily.rows?.[0] as { base_amount?: string | number; night_count?: number } | undefined;
    const computedNights = Number(row?.night_count ?? nights);
    const computedBase = parseFloat(String(row?.base_amount ?? baseAmount));
    if (Number.isFinite(computedNights) && computedNights > 0) {
      baseAmount =
        Number.isFinite(computedBase) && computedBase >= 0 ? computedBase : baseAmount;
      return { baseAmount, nights: computedNights };
    }
  } catch {
    /* tabla ausente o error → tarifa base */
  }

  return { baseAmount, nights };
}

export type GuestStayAmounts = {
  nights: number;
  baseAmount: number;
  extraGuests: number;
  extraGuestsAmount: number;
  subtotal: number;
  /** true si todas las noches salen al mismo precio que base_price */
  uniformNightly: boolean;
  averageNightly: number;
};

export function computeGuestStayAmounts(params: {
  nights: number;
  baseAmount: number;
  basePrice: number;
  cleaningFee: number;
  guests: number;
  includedGuests: number;
  extraGuestFee: number;
}): GuestStayAmounts {
  const { nights, baseAmount, basePrice, cleaningFee, guests, includedGuests, extraGuestFee } =
    params;
  const extraGuests = Math.max(0, Number(guests) - includedGuests);
  const extraGuestsAmount =
    extraGuests > 0 && nights > 0 ? extraGuestFee * extraGuests * nights : 0;
  const subtotal = baseAmount + cleaningFee + extraGuestsAmount;
  const uniformNightly =
    nights > 0 && Math.abs(baseAmount - basePrice * nights) < 0.02;
  const averageNightly = nights > 0 ? baseAmount / nights : basePrice;

  return {
    nights,
    baseAmount,
    extraGuests,
    extraGuestsAmount,
    subtotal,
    uniformNightly,
    averageNightly,
  };
}
