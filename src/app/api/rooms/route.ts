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
    const result = await sql`
      SELECT * FROM rooms 
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
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

    // Insertar habitación en la base de datos con tenant_id
    const result = await sql`
      INSERT INTO rooms (
        id, name, description, capacity, base_price, 
        ical_out_url, ical_in_booking_url, ical_in_airbnb_url, tenant_id
      ) VALUES (
        ${Date.now().toString()},
        ${body.name},
        ${body.description || ''},
        ${body.capacity || 2},
        ${body.base_price},
        ${body.ical_out_url || ''},
        ${body.ical_in_booking_url || ''},
        ${body.ical_in_airbnb_url || ''},
        ${tenantId}
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
