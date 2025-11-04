import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isTenantActive } from './payment-tracking';

/**
 * Verifica si un tenant puede realizar operaciones (no está suspendido)
 * Devuelve el tenant si está activo, o null si está suspendido
 */
export async function checkTenantCanOperate(tenantId: string) {
  const isActive = await isTenantActive(tenantId);
  
  if (!isActive) {
    // Obtener información del tenant para el mensaje de error
    const result = await sql`
      SELECT 
        status, 
        subscription_status, 
        payment_retry_count,
        subscription_suspended_at
      FROM tenants 
      WHERE id = ${tenantId}
    `;
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const tenant = result.rows[0];
    return {
      canOperate: false,
      reason: tenant.status === 'suspended' 
        ? 'suspended' 
        : tenant.payment_retry_count >= 3 
          ? 'payment_failed' 
          : 'inactive',
      tenant,
    };
  }
  
  return { canOperate: true };
}

/**
 * Middleware para verificar estado de pago en APIs
 * Devuelve un objeto con error si el tenant está suspendido, o null si está activo
 */
export async function requireActiveTenant(
  req: NextRequest,
  tenantId: string
): Promise<{ error: string; code: string; reason: string; status: number } | null> {
  const check = await checkTenantCanOperate(tenantId);
  
  if (!check || !check.canOperate) {
    const reason = check?.reason || 'inactive';
    
    let message = 'Los servicios están suspendidos por falta de pago.';
    let status = 403;
    
    if (reason === 'suspended') {
      message = 'Los servicios están suspendidos por falta de pago. Por favor, actualiza tu método de pago y realiza el pago pendiente para reactivar los servicios.';
    } else if (reason === 'payment_failed') {
      message = 'No se ha podido procesar el pago de tu suscripción. Por favor, actualiza tu método de pago.';
    }
    
    return {
      error: message,
      code: 'SUSPENDED',
      reason,
      status,
    };
  }
  
  return null; // Tenant activo, continuar
}

/**
 * Lista de rutas que permiten acceso de solo lectura incluso si está suspendido
 */
const READ_ONLY_ROUTES = [
  '/api/tenant',
  '/api/reservations',
  '/api/rooms',
  '/api/guests',
  '/api/billing',
  '/api/settings',
  '/api/guest-registrations',
];

/**
 * Lista de rutas que requieren tenant activo (no permiten acceso si está suspendido)
 */
const WRITE_ROUTES = [
  '/api/reservations',
  '/api/guest-registrations/create',
  '/api/guest-registrations/submit',
  '/api/messages',
  '/api/direct-reservations',
];

/**
 * Verifica si una ruta es de solo lectura
 */
export function isReadOnlyRoute(pathname: string): boolean {
  return READ_ONLY_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Verifica si una ruta requiere tenant activo (escritura)
 */
export function isWriteRoute(pathname: string): boolean {
  return WRITE_ROUTES.some(route => pathname.startsWith(route));
}

