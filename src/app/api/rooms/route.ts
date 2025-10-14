import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Obtener tenant_id del header (enviado por el middleware)
    const tenantId = req.headers.get('x-tenant-id');
    
    console.log('🔍 DEBUG /api/rooms: tenant_id recibido:', tenantId);
    
    if (!tenantId) {
      console.log('❌ DEBUG /api/rooms: No se pudo identificar el tenant');
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }

    // Obtener todas las habitaciones de la tabla Room
    // Simplificar la consulta para evitar problemas con JOINs
    console.log('🔍 DEBUG /api/rooms: Obteniendo todas las habitaciones...');
    
    const result = await sql`
      SELECT * FROM "Room" 
      ORDER BY id DESC
    `;
    
    console.log('🔍 DEBUG /api/rooms: Consulta ejecutada exitosamente');

    console.log(`🔍 DEBUG /api/rooms: Resultado final:`, result.rows);
    console.log(`🏨 Obtenidas ${result.rows.length} habitaciones para tenant ${tenantId}`);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('❌ DEBUG /api/rooms: Error completo:', error);
    console.error('❌ DEBUG /api/rooms: Stack trace:', error.stack);
    return NextResponse.json(
      { 
        error: 'Error al obtener las habitaciones',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Obtener tenant_id del header (enviado por el middleware)
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }
    
    // Validar datos requeridos
    if (!body.name || !body.base_price) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (name, base_price)' },
        { status: 400 }
      );
    }

    // Verificar límites del plan
    const tenantResult = await sql`
      SELECT max_rooms, (SELECT COUNT(*) FROM "Room" r JOIN "Lodging" l ON r."lodgingId" = l.id WHERE l."tenantId" = ${tenantId}) as current_rooms
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
    const currentRooms = parseInt(tenant.current_rooms);
    const maxRooms = tenant.max_rooms;

    // Verificar si puede añadir más habitaciones
    if (maxRooms !== -1 && currentRooms >= maxRooms) {
      return NextResponse.json(
        { 
          error: 'Límite de habitaciones alcanzado',
          message: `Tu plan actual permite máximo ${maxRooms} habitaciones. Upgrade tu plan para añadir más habitaciones.`,
          current_rooms: currentRooms,
          max_rooms: maxRooms,
          upgrade_required: true
        },
        { status: 403 }
      );
    }

    // Insertar habitación en la base de datos con tenant_id
    // Obtener el lodgingId correspondiente al tenantId
    const lodgingResult = await sql`
      SELECT id FROM "Lodging" WHERE "tenantId" = ${tenantId} LIMIT 1
    `;
    
    if (lodgingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró un alojamiento para este tenant' },
        { status: 404 }
      );
    }
    
    const lodgingId = lodgingResult.rows[0].id;
    
    // Obtener el siguiente número de habitación disponible (1-6)
    const existingRooms = await sql`
      SELECT id FROM "Room" WHERE "lodgingId" = ${lodgingId} ORDER BY id
    `;
    
    // Encontrar el siguiente número disponible del 1 al 6
    let nextRoomNumber = 1;
    const existingNumbers = existingRooms.rows
      .map(room => {
        const match = room.id.match(/^(\d+)$/);
        return match ? parseInt(match[1]) : null;
      })
      .filter(num => num !== null && num >= 1 && num <= 6);
    
    for (let i = 1; i <= 6; i++) {
      if (!existingNumbers.includes(i)) {
        nextRoomNumber = i;
        break;
      }
    }
    
    console.log(`🏠 Creando habitación con número: ${nextRoomNumber}`);

    const result = await sql`
      INSERT INTO "Room" (
        id, name, description, capacity, "basePrice", 
        "icalOutUrl", "icalInBookingUrl", "icalInAirbnbUrl", "lodgingId"
      ) VALUES (
        ${nextRoomNumber.toString()},
        ${body.name},
        ${body.description || ''},
        ${body.capacity || 2},
        ${body.base_price},
        ${body.ical_out_url || ''},
        ${body.ical_in_booking_url || ''},
        ${body.ical_in_airbnb_url || ''},
        ${lodgingId}
      ) RETURNING *
    `;

    const newRoom = result.rows[0];
    console.log(`🏨 Habitación creada: ${newRoom.name} para tenant ${tenantId}`);

    return NextResponse.json(newRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Error al crear la habitación' },
      { status: 500 }
    );
  }
}
