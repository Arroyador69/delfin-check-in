import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    const result = await sql`
      SELECT room_name, room_order
      FROM tenant_room_configs
      WHERE tenant_id = ${tenantId}
      ORDER BY room_order ASC
    `;

    const rooms = result.rows.map(row => ({
      id: row.room_order,
      name: row.room_name
    }));

    return NextResponse.json({
      success: true,
      rooms: rooms
    });

  } catch (error) {
    console.error('Error obteniendo habitaciones:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo habitaciones',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const { rooms } = await req.json();

    if (!Array.isArray(rooms)) {
      return NextResponse.json({
        success: false,
        message: 'Formato de datos inválido'
      }, { status: 400 });
    }

    // Obtener límites del tenant
    const tenantResult = await sql`
      SELECT plan_limits
      FROM tenants
      WHERE id = ${tenantId}
    `;

    if (tenantResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tenant no encontrado'
      }, { status: 404 });
    }

    const limits = tenantResult.rows[0].plan_limits || {};
    const maxRooms = limits.max_rooms || 6;

    // Validar que no exceda el límite
    if (rooms.length > maxRooms) {
      return NextResponse.json({
        success: false,
        message: `No puedes tener más de ${maxRooms} habitaciones según tu plan`
      }, { status: 400 });
    }

    // Eliminar configuración anterior
    await sql`
      DELETE FROM tenant_room_configs
      WHERE tenant_id = ${tenantId}
    `;

    // Insertar nueva configuración
    if (rooms.length > 0) {
      const values = rooms.map((room, index) => 
        `('${tenantId}', '${room.name.replace(/'/g, "''")}', ${index + 1})`
      ).join(', ');

      await sql`
        INSERT INTO tenant_room_configs (tenant_id, room_name, room_order)
        VALUES ${sql.unsafe(values)}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración de habitaciones guardada correctamente',
      rooms: rooms
    });

  } catch (error) {
    console.error('Error guardando habitaciones:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error guardando habitaciones',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
