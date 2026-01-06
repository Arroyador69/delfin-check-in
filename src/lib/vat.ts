/**
 * ========================================
 * SISTEMA DE CÁLCULO DE IVA POR PAÍS
 * ========================================
 * Calcula IVA automáticamente según el país del tenant
 */

import { sql } from '@vercel/postgres';

export interface VATCalculation {
  basePrice: number;
  vatRate: number;
  vatAmount: number;
  totalPrice: number;
  currency: string;
}

/**
 * Obtiene la tasa de IVA para un país
 */
export async function getVATRate(countryCode: string | null | undefined): Promise<number> {
  if (!countryCode) {
    // Default: España 21%
    return 21.00;
  }

  try {
    const result = await sql`
      SELECT vat_rate FROM countries WHERE code = ${countryCode.toUpperCase()} LIMIT 1
    `;

    if (result.rows.length > 0) {
      return parseFloat(result.rows[0].vat_rate);
    }

    // Si no se encuentra, usar España como default
    return 21.00;
  } catch (error) {
    console.warn('⚠️ Error obteniendo tasa de IVA, usando default 21%:', error);
    return 21.00;
  }
}

/**
 * Calcula IVA para un precio base
 */
export async function calculateVAT(
  basePrice: number,
  countryCode?: string | null
): Promise<VATCalculation> {
  const vatRate = await getVATRate(countryCode);
  const vatAmount = (basePrice * vatRate) / 100;
  const totalPrice = basePrice + vatAmount;

  return {
    basePrice,
    vatRate,
    vatAmount: Math.round(vatAmount * 100) / 100, // Redondear a 2 decimales
    totalPrice: Math.round(totalPrice * 100) / 100,
    currency: 'EUR'
  };
}

/**
 * Calcula precio base desde precio total con IVA
 */
export function calculateBasePrice(totalPrice: number, vatRate: number): number {
  return Math.round((totalPrice / (1 + vatRate / 100)) * 100) / 100;
}

