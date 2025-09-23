import { NextRequest, NextResponse } from 'next/server';
import { getRooms, createRoom } from '@/lib/storage';

export async function GET() {
  try {
    const rooms = getRooms();
    return NextResponse.json(rooms);
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
    
    // Validar datos requeridos
    if (!body.name || !body.base_price) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (name, base_price)' },
        { status: 400 }
      );
    }

    const newRoom = {
      id: Date.now().toString(),
      name: body.name,
      description: body.description || '',
      capacity: body.capacity || 2,
      base_price: body.base_price,
      ical_out_url: body.ical_out_url || '',
      ical_in_booking_url: body.ical_in_booking_url || '',
      ical_in_airbnb_url: body.ical_in_airbnb_url || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Guardar en almacenamiento
    createRoom(newRoom);

    return NextResponse.json(newRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Error al crear la habitación' },
      { status: 500 }
    );
  }
}
