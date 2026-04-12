import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken, AUTH_CONFIG } from '@/lib/auth';
import type { Tenant } from '@/lib/tenant';
import { getTenantPlanPresentation } from '@/lib/tenant-plan-billing';
import { hasCheckinInstructionsEmailPlan } from '@/lib/checkin-email-plan';

function parseTenantStat(value: unknown): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * API para obtener información del tenant actual.
 * Acepta x-tenant-id (middleware) o cookie auth_token (fallback).
 */
export async function GET(req: NextRequest) {
  try {
    let tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      const authToken = req.cookies.get(AUTH_CONFIG.cookieName)?.value;
      if (authToken) {
        const payload = verifyToken(authToken);
        if (payload?.tenantId) tenantId = payload.tenantId;
      }
    }
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    // Asegurar que las tablas de tenant existen
    try {
      await sql`SELECT 1 FROM tenants LIMIT 1`;
    } catch (error) {
      console.log('🔧 Tabla tenants no existe, creándola...');
      await sql`
        CREATE TABLE IF NOT EXISTS tenants (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          plan_id VARCHAR(50) NOT NULL CHECK (plan_id IN ('basic', 'standard', 'premium', 'enterprise')),
          max_rooms INTEGER NOT NULL DEFAULT 2,
          current_rooms INTEGER NOT NULL DEFAULT 0 CHECK (current_rooms >= 0),
          stripe_customer_id VARCHAR(255) UNIQUE,
          stripe_subscription_id VARCHAR(255),
          status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
          trial_ends_at TIMESTAMP WITH TIME ZONE,
          config JSONB DEFAULT '{"propertyName": "", "timezone": "Europe/Madrid", "language": "es", "currency": "EUR"}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT valid_rooms_count CHECK (current_rooms <= max_rooms OR max_rooms = -1)
        );
      `;
      
      // Crear tenant por defecto si no existe
      await sql`
        INSERT INTO tenants (id, name, email, plan_id, max_rooms, status)
        VALUES ('870e589f-d313-4a5a-901f-f25fd4e7240a', 'Admin Default', 'admin@delfincheckin.com', 'basic', 2, 'active')
        ON CONFLICT (id) DO NOTHING;
      `;
      
      console.log('✅ Tabla tenants creada correctamente');
    }

    // Obtener información del tenant (incluyendo nuevos campos)
    const tenantResult = await sql`
      SELECT 
        id, name, email, plan_id, plan_type, max_rooms, current_rooms, 
        ads_enabled, legal_module, country_code, onboarding_status,
        status, config, created_at
      FROM tenants 
      WHERE id = ${tenantId}
    `;

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const tenant = tenantResult.rows[0];

    // Obtener nombre de la empresa desde empresa_config
    const tenantIdString = String(tenantId);
    let empresaNombre = tenant.name; // Fallback al nombre del tenant
    
    try {
      const empresaResult = await sql`
        SELECT nombre_empresa 
        FROM empresa_config 
        WHERE tenant_id = ${tenantIdString}
        LIMIT 1
      `;
      
      if (empresaResult.rows.length > 0 && empresaResult.rows[0].nombre_empresa) {
        empresaNombre = empresaResult.rows[0].nombre_empresa;
      }
    } catch (error) {
      console.warn('⚠️ No se pudo obtener nombre de empresa, usando nombre del tenant:', error);
    }

    // Obtener estadísticas actuales del tenant (con manejo de tablas que pueden no existir)
    let stats = {
      total_rooms: 0,
      total_reservations: 0,
      total_guests: 0,
      total_registrations: 0
    };

    try {
      // Obtener lodging_id del tenant primero
      const tenantLodgingResult = await sql`
        SELECT lodging_id FROM tenants WHERE id = ${tenantId}
      `;
      
      const lodgingId = tenantLodgingResult.rows[0]?.lodging_id || tenantId;
      
      const statsResult = await sql`
        SELECT 
          (SELECT COUNT(*) FROM "Room" r WHERE r."lodgingId" = ${lodgingId}::text) as total_rooms,
          (SELECT COUNT(*) FROM reservations WHERE tenant_id = ${tenantId}::uuid) as total_reservations,
          (SELECT COUNT(*) FROM guests WHERE tenant_id = ${tenantId}::uuid) as total_guests,
          (SELECT COUNT(*) FROM guest_registrations WHERE tenant_id = ${tenantId}::uuid) as total_registrations
      `;
      
      if (statsResult.rows.length > 0) {
        const row = statsResult.rows[0] as Record<string, unknown>;
        stats = {
          total_rooms: parseTenantStat(row.total_rooms),
          total_reservations: parseTenantStat(row.total_reservations),
          total_guests: parseTenantStat(row.total_guests),
          total_registrations: parseTenantStat(row.total_registrations),
        };
        // Si no hay lodging_id configurado, intentar contar usando tenant_id como fallback
        if (stats.total_rooms === 0 && !tenantLodgingResult.rows[0]?.lodging_id) {
          console.log(`⚠️ No se encontraron habitaciones usando lodging_id. Intentando con tenant_id...`);
          const fallbackStats = await sql`
            SELECT COUNT(*) as total_rooms
            FROM "Room" r 
            WHERE r."lodgingId" = ${tenantId}::text
          `;
          if (fallbackStats.rows.length > 0) {
            const fr = fallbackStats.rows[0] as Record<string, unknown>;
            const tr = parseTenantStat(fr.total_rooms);
            if (tr > 0) {
              stats.total_rooms = tr;
              console.log(`✅ Encontradas ${stats.total_rooms} habitaciones usando tenant_id como fallback`);
            }
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Error obteniendo estadísticas:', error);
      console.log('⚠️ Algunas tablas no existen aún, usando valores por defecto');
    }

    const roomsUsed = stats.total_rooms || 0;
    const planPresent = await getTenantPlanPresentation(tenant as unknown as Tenant, roomsUsed);
    const maxRoomsUi = planPresent.max_rooms_effective;

    const response = {
      tenant: {
        id: tenant.id,
        name: empresaNombre, // Usar nombre de la empresa en lugar del nombre del tenant
        email: tenant.email,
        plan_id: tenant.plan_id,
        plan_type: planPresent.effective_plan_type,
        plan_name: planPresent.plan_name,
        plan_price: planPresent.plan_price_total,
        plan_price_ex_vat: planPresent.plan_price_ex_vat,
        plan_vat_rate: planPresent.plan_vat_rate,
        plan_vat_amount: planPresent.plan_vat_amount,
        plan_price_total: planPresent.plan_price_total,
        plan_features: planPresent.plan_features,
        billing_rooms: planPresent.billing_rooms,
        max_rooms: maxRoomsUi,
        current_rooms: stats.total_rooms,
        ads_enabled: tenant.ads_enabled !== undefined ? tenant.ads_enabled : (tenant.plan_type !== 'pro' && tenant.plan_type !== 'standard' && tenant.plan_id !== 'pro' && tenant.plan_id !== 'enterprise'),
        legal_module: tenant.legal_module || false,
        country_code: tenant.country_code || null,
        // Legacy: si onboarding_status es NULL (tenants creados antes de este campo),
        // asumimos 'completed' para no forzar onboarding en cuentas existentes.
        onboarding_status:
          tenant.onboarding_status === null || tenant.onboarding_status === undefined
            ? 'completed'
            : tenant.onboarding_status,
        status: tenant.status,
        config: tenant.config,
        created_at: tenant.created_at,
        checkin_instructions_email: hasCheckinInstructionsEmailPlan(tenant as Tenant),
      },
      stats: {
        total_rooms: stats.total_rooms,
        total_reservations: stats.total_reservations,
        total_guests: stats.total_guests,
        total_registrations: stats.total_registrations,
        rooms_used: stats.total_rooms,
        rooms_remaining: maxRoomsUi === -1 ? -1 : Math.max(0, maxRoomsUi - stats.total_rooms)
      },
      limits: {
        can_add_rooms: maxRoomsUi === -1 || stats.total_rooms < maxRoomsUi,
        rooms_usage_percentage:
          maxRoomsUi === -1 ? 0 : Math.round((stats.total_rooms / maxRoomsUi) * 100),
        rooms_remaining: maxRoomsUi === -1 ? -1 : Math.max(0, maxRoomsUi - stats.total_rooms),
        limit_message: maxRoomsUi === -1 
          ? null 
          : stats.total_rooms >= maxRoomsUi
          ? {
              type: 'error',
              message: `⚠️ Límite alcanzado: Has usado todas las ${maxRoomsUi} unidades de tu plan ${planPresent.plan_name}.`,
              suggestion: 'Para añadir más habitaciones, actualiza tu plan desde la página de Mejora de Plan.'
            }
          : Math.round((stats.total_rooms / maxRoomsUi) * 100) >= 80
          ? {
              type: 'warning',
              message: `⚡ Estás cerca del límite: ${stats.total_rooms}/${maxRoomsUi} unidades (${Math.round((stats.total_rooms / maxRoomsUi) * 100)}% usado).`,
              suggestion: `Te quedan ${maxRoomsUi - stats.total_rooms} unidades disponibles. Considera actualizar tu plan si necesitas más capacidad.`
            }
          : null
      }
    };

    console.log(`🏢 Información del tenant obtenida: ${tenant.name} (${tenant.plan_id})`);
    return NextResponse.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Error fetching tenant info:', error);
    return NextResponse.json(
      { error: 'Error al obtener información del tenant' },
      { status: 500 }
    );
  }
}
