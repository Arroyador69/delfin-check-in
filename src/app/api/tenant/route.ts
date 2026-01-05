import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * API para obtener información del tenant actual
 * Usado por el dashboard para mostrar límites y configuración del plan
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener tenant_id del header (enviado por el middleware)
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
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
        stats = statsResult.rows[0];
        // Si no hay lodging_id configurado, intentar contar usando tenant_id como fallback
        if (parseInt(stats.total_rooms) === 0 && !tenantLodgingResult.rows[0]?.lodging_id) {
          console.log(`⚠️ No se encontraron habitaciones usando lodging_id. Intentando con tenant_id...`);
          const fallbackStats = await sql`
            SELECT COUNT(*) as total_rooms
            FROM "Room" r 
            WHERE r."lodgingId" = ${tenantId}::text
          `;
          if (fallbackStats.rows.length > 0 && parseInt(fallbackStats.rows[0].total_rooms) > 0) {
            stats.total_rooms = fallbackStats.rows[0].total_rooms;
            console.log(`✅ Encontradas ${stats.total_rooms} habitaciones usando tenant_id como fallback`);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Error obteniendo estadísticas:', error);
      console.log('⚠️ Algunas tablas no existen aún, usando valores por defecto');
    }

    // Información del plan
    const planInfo = {
      basic: { name: 'Básico', max_rooms: 2, price: 29, features: ['Hasta 2 habitaciones', 'Soporte básico'] },
      standard: { name: 'Estándar', max_rooms: 4, price: 49, features: ['Hasta 4 habitaciones', 'Soporte prioritario'] },
      premium: { name: 'Premium', max_rooms: 6, price: 79, features: ['Hasta 6 habitaciones', 'Soporte prioritario', 'Analytics avanzados'] },
      enterprise: { name: 'Empresa', max_rooms: -1, price: 149, features: ['Habitaciones ilimitadas', 'Soporte 24/7', 'Analytics avanzados', 'API personalizada'] }
    };

    const currentPlan = planInfo[tenant.plan_id as keyof typeof planInfo];

    const response = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        plan_id: tenant.plan_id,
        plan_type: tenant.plan_type || (tenant.plan_id === 'pro' ? 'pro' : tenant.plan_id === 'premium' ? 'free_legal' : 'free'),
        plan_name: currentPlan.name,
        plan_price: currentPlan.price,
        plan_features: currentPlan.features,
        max_rooms: tenant.max_rooms,
        current_rooms: parseInt(stats.total_rooms),
        ads_enabled: tenant.ads_enabled !== undefined ? tenant.ads_enabled : (tenant.plan_type !== 'pro' && tenant.plan_id !== 'pro'),
        legal_module: tenant.legal_module || false,
        country_code: tenant.country_code || null,
        onboarding_status: tenant.onboarding_status || 'pending',
        status: tenant.status,
        config: tenant.config,
        created_at: tenant.created_at
      },
      stats: {
        total_rooms: parseInt(stats.total_rooms),
        total_reservations: parseInt(stats.total_reservations),
        total_guests: parseInt(stats.total_guests),
        total_registrations: parseInt(stats.total_registrations),
        rooms_used: parseInt(stats.total_rooms),
        rooms_remaining: tenant.max_rooms === -1 ? -1 : Math.max(0, tenant.max_rooms - parseInt(stats.total_rooms))
      },
      limits: {
        can_add_rooms: tenant.max_rooms === -1 || parseInt(stats.total_rooms) < tenant.max_rooms,
        rooms_usage_percentage: tenant.max_rooms === -1 ? 0 : Math.round((parseInt(stats.total_rooms) / tenant.max_rooms) * 100),
        rooms_remaining: tenant.max_rooms === -1 ? -1 : Math.max(0, tenant.max_rooms - parseInt(stats.total_rooms)),
        limit_message: tenant.max_rooms === -1 
          ? null 
          : parseInt(stats.total_rooms) >= tenant.max_rooms
          ? {
              type: 'error',
              message: `⚠️ Límite alcanzado: Has usado todas las ${tenant.max_rooms} habitaciones de tu plan ${currentPlan.name}.`,
              suggestion: 'Para añadir más habitaciones, actualiza tu plan desde la página de Mejora de Plan.'
            }
          : Math.round((parseInt(stats.total_rooms) / tenant.max_rooms) * 100) >= 80
          ? {
              type: 'warning',
              message: `⚡ Estás cerca del límite: ${parseInt(stats.total_rooms)}/${tenant.max_rooms} habitaciones (${Math.round((parseInt(stats.total_rooms) / tenant.max_rooms) * 100)}% usado).`,
              suggestion: `Te quedan ${tenant.max_rooms - parseInt(stats.total_rooms)} habitaciones disponibles. Considera actualizar tu plan si necesitas más capacidad.`
            }
          : null
      }
    };

    console.log(`🏢 Información del tenant obtenida: ${tenant.name} (${tenant.plan_id})`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching tenant info:', error);
    return NextResponse.json(
      { error: 'Error al obtener información del tenant' },
      { status: 500 }
    );
  }
}
