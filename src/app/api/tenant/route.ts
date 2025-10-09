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

    // Obtener información del tenant
    const tenantResult = await sql`
      SELECT 
        id, name, email, plan_id, max_rooms, current_rooms, 
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

    // Obtener estadísticas actuales del tenant
    const statsResult = await sql`
      SELECT 
        (SELECT COUNT(*) FROM rooms WHERE tenant_id = ${tenantId}) as total_rooms,
        (SELECT COUNT(*) FROM reservations WHERE tenant_id = ${tenantId}) as total_reservations,
        (SELECT COUNT(*) FROM guests WHERE tenant_id = ${tenantId}) as total_guests,
        (SELECT COUNT(*) FROM guest_registrations WHERE tenant_id = ${tenantId}) as total_registrations
    `;

    const stats = statsResult.rows[0];

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
        plan_name: currentPlan.name,
        plan_price: currentPlan.price,
        plan_features: currentPlan.features,
        max_rooms: tenant.max_rooms,
        current_rooms: parseInt(stats.total_rooms),
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
        rooms_usage_percentage: tenant.max_rooms === -1 ? 0 : Math.round((parseInt(stats.total_rooms) / tenant.max_rooms) * 100)
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
