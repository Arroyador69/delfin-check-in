/**
 * ========================================
 * SISTEMA DE PRECIOS DE PLANES
 * ========================================
 * Calcula precios de planes según habitaciones y país
 */

import { calculateVAT, VATCalculation } from './vat';

export interface PlanPricing {
  planId: 'free' | 'checkin' | 'pro';
  basePrice: number; // Precio base sin IVA
  roomCount: number; // Número de habitaciones
  extraRooms?: number; // Habitaciones adicionales (solo checkin)
  extraRoomsPrice?: number; // Precio de habitaciones extra
  subtotal: number; // Precio total sin IVA
  vat: VATCalculation; // Cálculo de IVA
  total: number; // Precio total con IVA
}

/**
 * Calcula precio del plan Check-in según número de habitaciones
 * Plan Check-in: 8€ base + 4€ por habitación adicional (más de 2)
 */
export function calculateCheckinPrice(roomCount: number): {
  basePrice: number;
  extraRooms: number;
  extraRoomsPrice: number;
  subtotal: number;
} {
  const BASE_PRICE = 8.00;
  const ROOMS_INCLUDED = 2;
  const PRICE_PER_EXTRA_ROOM = 4.00;

  if (roomCount <= ROOMS_INCLUDED) {
    return {
      basePrice: BASE_PRICE,
      extraRooms: 0,
      extraRoomsPrice: 0,
      subtotal: BASE_PRICE
    };
  }

  const extraRooms = roomCount - ROOMS_INCLUDED;
  const extraRoomsPrice = extraRooms * PRICE_PER_EXTRA_ROOM;
  const subtotal = BASE_PRICE + extraRoomsPrice;

  return {
    basePrice: BASE_PRICE,
    extraRooms,
    extraRoomsPrice,
    subtotal
  };
}

/**
 * Calcula precio del plan Pro según número de habitaciones
 * Plan Pro: 29,99€ base para hasta 6 habitaciones, luego precio adicional
 */
export function calculateProPrice(roomCount: number): {
  basePrice: number;
  extraRooms: number;
  extraRoomsPrice: number;
  subtotal: number;
} {
  const BASE_PRICE = 29.99;
  const ROOMS_INCLUDED = 6;
  const PRICE_PER_EXTRA_ROOM = 5.00; // 5€ por habitación adicional después de 6

  if (roomCount <= ROOMS_INCLUDED) {
    return {
      basePrice: BASE_PRICE,
      extraRooms: 0,
      extraRoomsPrice: 0,
      subtotal: BASE_PRICE
    };
  }

  const extraRooms = roomCount - ROOMS_INCLUDED;
  const extraRoomsPrice = extraRooms * PRICE_PER_EXTRA_ROOM;
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
  planId: 'free' | 'checkin' | 'pro',
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

    case 'checkin':
      const checkinCalc = calculateCheckinPrice(roomCount);
      basePrice = checkinCalc.basePrice;
      extraRooms = checkinCalc.extraRooms;
      extraRoomsPrice = checkinCalc.extraRoomsPrice;
      subtotal = checkinCalc.subtotal;
      break;

    case 'pro':
      const proCalc = calculateProPrice(roomCount);
      basePrice = proCalc.basePrice;
      extraRooms = proCalc.extraRooms;
      extraRoomsPrice = proCalc.extraRoomsPrice;
      subtotal = proCalc.subtotal;
      break;
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

