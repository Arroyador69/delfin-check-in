import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({
        success: false,
        error: 'No se pudo identificar el tenant'
      }, { status: 400 });
    }

    const result = await sql`
      SELECT id, name
      FROM "Room"
      WHERE "lodgingId" = (
        SELECT lodging_id FROM tenants WHERE id = ${tenantId}
      )
      ORDER BY id ASC
    `;

    const rooms = result.rows.map(row => ({
      id: parseInt(row.id),
      name: row.name
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
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({
        success: false,
        error: 'No se pudo identificar el tenant'
      }, { status: 400 });
    }
    const { rooms } = await req.json();

    if (!Array.isArray(rooms)) {
      return NextResponse.json({
        success: false,
        message: 'Formato de datos inválido'
      }, { status: 400 });
    }

    // Obtener información del tenant (límites y lodging_id)
    const tenantResult = await sql`
      SELECT max_rooms, lodging_id, status, name
      FROM tenants
      WHERE id = ${tenantId}
    `;

    if (tenantResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tenant no encontrado'
      }, { status: 404 });
    }

    const tenant = tenantResult.rows[0];
    const lodgingId = tenant.lodging_id;
    
    // Usar el límite personalizado que el cliente contrató
    const maxRooms = tenant.max_rooms || 6; // Default a 6 si no está configurado
    
    console.log(`🏢 Tenant ${tenantId} (${tenant.name}): Límite contratado: ${maxRooms} habitaciones`);

    // Validar que no exceda el límite contratado
    if (maxRooms !== -1 && rooms.length > maxRooms) {
      return NextResponse.json({
        success: false,
        message: `No puedes tener más de ${maxRooms} habitaciones según tu contrato. Contacta con soporte si necesitas más habitaciones.`
      }, { status: 400 });
    }

    // Obtener habitaciones existentes
    const existingRooms = await sql`
      SELECT id, name
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
      ORDER BY id ASC
    `;

    console.log('Habitaciones existentes:', existingRooms.rows);
    console.log('Habitaciones a guardar:', rooms);

    // Procesar cada habitación
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const roomId = room.id.toString();
      
      // Verificar si la habitación ya existe
      const existingRoom = existingRooms.rows.find(r => r.id === roomId);
      
      if (existingRoom) {
        // Actualizar habitación existente
        await sql`
          UPDATE "Room"
          SET name = ${room.name}, updated_at = NOW()
          WHERE id = ${roomId} AND "lodgingId" = ${lodgingId}
        `;
        console.log(`✅ Actualizada habitación ${roomId}: ${room.name}`);
      } else {
        // Crear nueva habitación
        await sql`
          INSERT INTO "Room" (id, name, "lodgingId", created_at, updated_at)
          VALUES (${roomId}, ${room.name}, ${lodgingId}, NOW(), NOW())
        `;
        console.log(`✅ Creada nueva habitación ${roomId}: ${room.name}`);
      }
    }

    // Eliminar habitaciones que excedan el límite (si es necesario)
    if (rooms.length < maxRooms) {
      const roomsToDelete = await sql`
        DELETE FROM "Room"
        WHERE "lodgingId" = ${lodgingId}
        AND id::integer > ${rooms.length}
        RETURNING id, name
      `;
      
      if (roomsToDelete.rows.length > 0) {
        console.log('🗑️ Habitaciones eliminadas:', roomsToDelete.rows);
      }
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
