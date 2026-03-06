/**
 * ========================================
 * SISTEMA DE PRECIOS DE PLANES
 * ========================================
 * 4 planes: Básico (free), Check-in, Standard, Pro.
 * Ver PLANS.md para definición completa.
 */

import { calculateVAT, VATCalculation } from './vat';

export type PlanId = 'free' | 'checkin' | 'standard' | 'pro';

export interface PlanPricing {
  planId: PlanId;
  basePrice: number; // Precio base sin IVA
  roomCount: number; // Número de propiedades/habitaciones
  extraRooms?: number; // Propiedades adicionales (por encima de las incluidas)
  extraRoomsPrice?: number; // Precio de propiedades extra (2 €/mes cada una)
  subtotal: number; // Precio total sin IVA
  vat: VATCalculation; // Cálculo de IVA
  total: number; // Precio total con IVA
}

const PRICE_PER_EXTRA_PROPERTY = 2.0; // 2 €/mes por propiedad adicional (todos los planes de pago)

/**
 * Plan Check-in: 2 € base + 2 € por cada propiedad (1 prop = 2 €, 3 = 6 €, 5 = 10 €)
 */
export function calculateCheckinPrice(roomCount: number): {
  basePrice: number;
  extraRooms: number;
  extraRoomsPrice: number;
  subtotal: number;
} {
  const BASE_PRICE = 2.0;
  if (roomCount <= 0) {
    return { basePrice: BASE_PRICE, extraRooms: 0, extraRoomsPrice: 0, subtotal: BASE_PRICE };
  }
  if (roomCount === 1) {
    return { basePrice: BASE_PRICE, extraRooms: 0, extraRoomsPrice: 0, subtotal: BASE_PRICE };
  }
  const extraRooms = roomCount - 1;
  const extraRoomsPrice = extraRooms * PRICE_PER_EXTRA_PROPERTY;
  const subtotal = BASE_PRICE + extraRoomsPrice;
  return {
    basePrice: BASE_PRICE,
    extraRooms,
    extraRoomsPrice,
    subtotal
  };
}

/**
 * Plan Standard: 9,99 € base, 4 propiedades incluidas, luego 2 €/propiedad extra
 */
export function calculateStandardPrice(roomCount: number): {
  basePrice: number;
  extraRooms: number;
  extraRoomsPrice: number;
  subtotal: number;
} {
  const BASE_PRICE = 9.99;
  const ROOMS_INCLUDED = 4;
  if (roomCount <= ROOMS_INCLUDED) {
    return { basePrice: BASE_PRICE, extraRooms: 0, extraRoomsPrice: 0, subtotal: BASE_PRICE };
  }
  const extraRooms = roomCount - ROOMS_INCLUDED;
  const extraRoomsPrice = extraRooms * PRICE_PER_EXTRA_PROPERTY;
  const subtotal = BASE_PRICE + extraRoomsPrice;
  return {
    basePrice: BASE_PRICE,
    extraRooms,
    extraRoomsPrice,
    subtotal
  };
}

/**
 * Plan Pro: 29,99 € base, 6 propiedades incluidas, luego 2 €/propiedad extra
 */
export function calculateProPrice(roomCount: number): {
  basePrice: number;
  extraRooms: number;
  extraRoomsPrice: number;
  subtotal: number;
} {
  const BASE_PRICE = 29.99;
  const ROOMS_INCLUDED = 6;
  if (roomCount <= ROOMS_INCLUDED) {
    return { basePrice: BASE_PRICE, extraRooms: 0, extraRoomsPrice: 0, subtotal: BASE_PRICE };
  }
  const extraRooms = roomCount - ROOMS_INCLUDED;
  const extraRoomsPrice = extraRooms * PRICE_PER_EXTRA_PROPERTY;
  const subtotal = BASE_PRICE + extraRoomsPrice;
  return {
    basePrice: BASE_PRICE,
    extraRooms,
    extraRoomsPrice,
    subtotal
  };
}

/**
 * Calcula precio completo de un plan con IVA
 */
export async function calculatePlanPrice(
  planId: PlanId,
  roomCount: number,
  countryCode?: string | null
): Promise<PlanPricing> {
  let basePrice = 0;
  let extraRooms = 0;
  let extraRoomsPrice = 0;
  let subtotal = 0;

  switch (planId) {
    case 'free':
      basePrice = 0;
      subtotal = 0;
      break;

    case 'checkin': {
      const calc = calculateCheckinPrice(roomCount);
      basePrice = calc.basePrice;
      extraRooms = calc.extraRooms;
      extraRoomsPrice = calc.extraRoomsPrice;
      subtotal = calc.subtotal;
      break;
    }

    case 'standard': {
      const calc = calculateStandardPrice(roomCount);
      basePrice = calc.basePrice;
      extraRooms = calc.extraRooms;
      extraRoomsPrice = calc.extraRoomsPrice;
      subtotal = calc.subtotal;
      break;
    }

    case 'pro': {
      const calc = calculateProPrice(roomCount);
      basePrice = calc.basePrice;
      extraRooms = calc.extraRooms;
      extraRoomsPrice = calc.extraRoomsPrice;
      subtotal = calc.subtotal;
      break;
    }
  }

  const vat = await calculateVAT(subtotal, countryCode);

  return {
    planId,
    basePrice,
    roomCount,
    extraRooms: extraRooms > 0 ? extraRooms : undefined,
    extraRoomsPrice: extraRoomsPrice > 0 ? extraRoomsPrice : undefined,
    subtotal,
    vat,
    total: vat.totalPrice
  };
}

/**
 * Comisión en reservas directas: Pro 5 %, resto 9 %
 */
export function getDirectReservationCommissionRate(planType: string | undefined | null): number {
  return planType === 'pro' ? 0.05 : 0.09;
}
