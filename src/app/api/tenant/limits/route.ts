import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    // Obtener tenant_id del header
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({
        success: false,
        error: 'No se pudo identificar el tenant'
      }, { status: 400 });
    }

    // Obtener información del tenant y sus límites
    const result = await sql`
      SELECT 
        t.id,
        t.name,
        t.plan_type,
        t.plan_limits,
        t.created_at,
        t.updated_at
      FROM tenants t
      WHERE t.id = ${tenantId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tenant no encontrado'
      }, { status: 404 });
    }

    const tenant = result.rows[0];
    const limits = tenant.plan_limits || {};

    // Obtener configuración actual de habitaciones desde tabla Room existente
    const roomsResult = await sql`
      SELECT id, name
      FROM "Room"
      WHERE "lodgingId" = (
        SELECT lodging_id FROM tenants WHERE id = ${tenantId}
      )
      ORDER BY id ASC
    `;

    const currentRooms = roomsResult.rows.map(row => ({
      id: parseInt(row.id),
      name: row.name
    }));

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        planType: tenant.plan_type,
        limits: {
          maxRooms: limits.max_rooms || 6, // Default a 6 si no está configurado
          maxReservations: limits.max_reservations || 100,
          maxGuests: limits.max_guests || 50
        }
      },
      currentRooms: currentRooms,
      message: 'Límites del tenant obtenidos correctamente'
    });

  } catch (error) {
    console.error('Error obteniendo límites del tenant:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo límites del tenant',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
