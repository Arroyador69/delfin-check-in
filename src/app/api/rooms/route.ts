import { NextRequest, NextResponse } from 'next/server';

// Almacenamiento en memoria del servidor
if (typeof global.serverStorage === 'undefined') {
  global.serverStorage = {
    rooms: [
      {
        id: '1',
        name: 'Habitación 1',
        description: 'Habitación doble con baño privado',
        capacity: 2,
        base_price: 80,
        ical_out_url: '',
        ical_in_booking_url: '',
        ical_in_airbnb_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Habitación 2',
        description: 'Habitación doble con baño privado',
        capacity: 2,
        base_price: 80,
        ical_out_url: '',
        ical_in_booking_url: '',
        ical_in_airbnb_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'Habitación 3',
        description: 'Habitación doble con baño privado',
        capacity: 2,
        base_price: 80,
        ical_out_url: '',
        ical_in_booking_url: '',
        ical_in_airbnb_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '4',
        name: 'Habitación 4',
        description: 'Habitación doble con baño privado',
        capacity: 2,
        base_price: 80,
        ical_out_url: '',
        ical_in_booking_url: '',
        ical_in_airbnb_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '5',
        name: 'Habitación 5',
        description: 'Habitación doble con baño privado',
        capacity: 2,
        base_price: 80,
        ical_out_url: '',
        ical_in_booking_url: '',
        ical_in_airbnb_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    reservations: []
  };
}

export async function GET() {
  try {
    const rooms = global.serverStorage.rooms || [];
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

    // Guardar en almacenamiento del servidor
    global.serverStorage.rooms.push(newRoom);

    return NextResponse.json(newRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Error al crear la habitación' },
      { status: 500 }
    );
  }
}
