/**
 * Funciones de utilidad para tracking de referidos
 */

import { sql } from '@/lib/db';

export interface ReferralTrackingData {
  referralCode: string;
  cookieId: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  landingPage?: string;
}

/**
 * Genera un ID único para la cookie
 */
export function generateCookieId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Obtiene el tenant_id desde un código de referido
 */
export async function getTenantIdFromReferralCode(referralCode: string): Promise<string | null> {
  try {
    const result = await sql`
      SELECT id 
      FROM tenants 
      WHERE referral_code = ${referralCode}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].id;
  } catch (error) {
    console.error('Error obteniendo tenant_id desde referral_code:', error);
    return null;
  }
}

/**
 * Registra un click de referido en la base de datos
 * Nota: Los clicks no se almacenan directamente, pero podríamos crear una tabla si es necesario
 * Por ahora, solo verificamos que el código existe y devolvemos el tenant_id
 */
export async function verifyReferralCode(referralCode: string): Promise<{ success: boolean; tenantId?: string; error?: string }> {
  try {
    const tenantId = await getTenantIdFromReferralCode(referralCode);

    if (!tenantId) {
      return {
        success: false,
        error: 'Código de referido inválido',
      };
    }

    return {
      success: true,
      tenantId,
    };
  } catch (error: any) {
    console.error('Error verificando referral code:', error);
    return {
      success: false,
      error: 'Error interno del servidor',
    };
  }
}

/**
 * Obtiene el código de referido desde una cookie
 */
export function parseReferralCookie(cookieValue: string): { code: string; cookieId: string; timestamp: number } | null {
  try {
    return JSON.parse(cookieValue);
  } catch (e) {
    return null;
  }
}
