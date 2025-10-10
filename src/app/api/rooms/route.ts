import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

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

    // Obtener habitaciones filtradas por tenant_id
    // Hacer JOIN con la tabla Lodging para filtrar por tenantId
    const result = await sql`
      SELECT r.* FROM "Room" r
      JOIN "Lodging" l ON r."lodgingId" = l.id
      WHERE l."tenantId" = ${tenantId}
      ORDER BY r."created_at" DESC
    `;

    console.log(`🏨 Obtenidas ${result.rows.length} habitaciones para tenant ${tenantId}`);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Error al obtener las habitaciones' },
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
    
    const result = await sql`
      INSERT INTO "Room" (
        id, name, description, capacity, "basePrice", 
        "icalOutUrl", "icalInBookingUrl", "icalInAirbnbUrl", "lodgingId"
      ) VALUES (
        ${Date.now().toString()},
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
