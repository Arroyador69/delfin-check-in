/**
 * ========================================
 * SISTEMA DE VALIDACIÓN DE PERMISOS
 * ========================================
 * Funciones para validar permisos según el plan del tenant
 * 
 * IMPORTANTE: Estas validaciones deben ejecutarse SIEMPRE en el backend.
 * El frontend solo oculta/muestra UI, pero el backend es la fuente de verdad.
 */

import { sql } from '@vercel/postgres';
import { NextRequest } from 'next/server';
import { getTenantId, getTenantById, Tenant, hasLegalModuleAccess, canCreateUnit, hasAdsEnabled } from './tenant';
import { verifyToken } from './auth';

/**
 * Verifica si el usuario es superadmin
 */
function isSuperAdmin(req: NextRequest): boolean {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) return false;
    
    const payload = verifyToken(authToken);
    return payload?.isPlatformAdmin === true;
  } catch {
    return false;
  }
}

/**
 * Obtiene el tenant del request y valida que exista
 */
export async function getTenantFromRequest(req: NextRequest): Promise<{ tenant: Tenant; tenantId: string } | null> {
  const tenantId = req.headers.get('x-tenant-id') || await getTenantId(req);
  
  if (!tenantId) {
    return null;
  }
  
  const tenant = await getTenantById(tenantId);
  
  if (!tenant) {
    return null;
  }
  
  return { tenant, tenantId };
}

/**
 * Valida acceso al módulo legal y retorna error si no tiene acceso
 * EXCEPCIÓN: Superadmins siempre tienen acceso
 */
export async function validateLegalModuleAccess(
  req: NextRequest,
  countryCode?: string
): Promise<{ success: true; tenant: Tenant } | { success: false; error: string; status: number }> {
  // Superadmins siempre tienen acceso
  if (isSuperAdmin(req)) {
    const tenantData = await getTenantFromRequest(req);
    if (tenantData) {
      return { success: true, tenant: tenantData.tenant };
    }
  }
  
  const tenantData = await getTenantFromRequest(req);
  
  if (!tenantData) {
    return { success: false, error: 'No se pudo identificar el tenant', status: 401 };
  }
  
  const { tenant } = tenantData;
  
  if (!hasLegalModuleAccess(tenant, countryCode)) {
    const planType = tenant.plan_type || 'free';
    return {
      success: false,
      error: `El módulo de registro de viajeros no está disponible en tu plan actual (${planType}). Actualiza a FREE+LEGAL o PRO para acceder.`,
      status: 403
    };
  }
  
  return { success: true, tenant };
}

/**
 * Valida que el tenant pueda crear una nueva unidad
 * EXCEPCIÓN: Superadmins siempre pueden crear unidades
 */
export async function validateUnitCreation(
  req: NextRequest
): Promise<{ success: true; tenant: Tenant } | { success: false; error: string; status: number }> {
  // Superadmins siempre pueden crear unidades
  if (isSuperAdmin(req)) {
    const tenantData = await getTenantFromRequest(req);
    if (tenantData) {
      return { success: true, tenant: tenantData.tenant };
    }
  }
  
  const tenantData = await getTenantFromRequest(req);
  
  if (!tenantData) {
    return { success: false, error: 'No se pudo identificar el tenant', status: 401 };
  }
  
  const { tenant } = tenantData;
  
  // Obtener conteo actual de unidades
  const countResult = await sql`
    SELECT COUNT(*) as count 
    FROM "Room" r
    INNER JOIN "Lodging" l ON r."lodgingId" = l.id
    WHERE l.tenant_id = ${tenant.id}::text
  `;
  
  const currentCount = parseInt(countResult.rows[0]?.count || '0', 10);
  
  const validation = canCreateUnit(tenant, currentCount);
  
  if (!validation.canCreate) {
    return {
      success: false,
      error: validation.reason || 'No puedes crear más unidades',
      status: 403
    };
  }
  
  return { success: true, tenant };
}

/**
 * Valida que el tenant esté activo
 */
export async function validateTenantActive(
  req: NextRequest
): Promise<{ success: true; tenant: Tenant } | { success: false; error: string; status: number }> {
  const tenantData = await getTenantFromRequest(req);
  
  if (!tenantData) {
    return { success: false, error: 'No se pudo identificar el tenant', status: 401 };
  }
  
  const { tenant } = tenantData;
  
  if (tenant.status !== 'active' && tenant.status !== 'trial') {
    return {
      success: false,
      error: `Tu cuenta está ${tenant.status}. Contacta con soporte para reactivarla.`,
      status: 403
    };
  }
  
  return { success: true, tenant };
}

/**
 * Middleware helper: Valida múltiples permisos a la vez
 */
export async function validatePermissions(
  req: NextRequest,
  options: {
    requireLegalModule?: boolean;
    requireUnitCreation?: boolean;
    countryCode?: string;
  }
): Promise<{ success: true; tenant: Tenant } | { success: false; error: string; status: number }> {
  // Primero validar que el tenant esté activo
  const activeCheck = await validateTenantActive(req);
  if (!activeCheck.success) {
    return activeCheck;
  }
  
  // Validar módulo legal si es requerido
  if (options.requireLegalModule) {
    const legalCheck = await validateLegalModuleAccess(req, options.countryCode);
    if (!legalCheck.success) {
      return legalCheck;
    }
  }
  
  // Validar creación de unidades si es requerido
  if (options.requireUnitCreation) {
    const unitCheck = await validateUnitCreation(req);
    if (!unitCheck.success) {
      return unitCheck;
    }
  }
  
  // Si llegamos aquí, todas las validaciones pasaron
  const tenantData = await getTenantFromRequest(req);
  return tenantData ? { success: true, tenant: tenantData.tenant } : { success: false, error: 'Error interno', status: 500 };
}

