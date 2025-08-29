import { NextRequest, NextResponse } from 'next/server';

// Almacenamiento en memoria del servidor
if (typeof global.serverStorage === 'undefined') {
  global.serverStorage = {
    reservations: []
  };
}

export async function GET() {
  try {
    const reservations = global.serverStorage.reservations || [];
    return NextResponse.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Error al obtener las reservas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos requeridos
    if (!body.guest_name || !body.room_id || !body.check_in || !body.check_out) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Calcular datos financieros
    const guest_paid = body.guest_paid || body.total_price || 0;
    const platform_commission = body.platform_commission || calculateCommission(guest_paid, body.channel || 'manual');
    const net_income = body.net_income || (guest_paid - platform_commission);

    const reservation = {
      id: Date.now().toString(),
      external_id: body.external_id || `manual_${Date.now()}`,
      room_id: body.room_id,
      guest_name: body.guest_name,
      guest_email: body.guest_email || '',
      check_in: body.check_in,
      check_out: body.check_out,
      channel: body.channel || 'manual',
      total_price: body.total_price || 0,
      guest_paid,
      platform_commission,
      net_income,
      currency: body.currency || 'EUR',
      status: body.status || 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Guardar en almacenamiento del servidor
    global.serverStorage.reservations.push(reservation);

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Error al crear la reserva' },
      { status: 500 }
    );
  }
}

// Función para calcular comisiones
function calculateCommission(amount: number, channel: 'airbnb' | 'booking' | 'manual'): number {
  switch (channel) {
    case 'booking':
      return Math.round(amount * 0.15 * 100) / 100; // 15% comisión Booking
    case 'airbnb':
      return Math.round(amount * 0.14 * 100) / 100; // 14% comisión Airbnb
    case 'manual':
      return 0; // Sin comisión para reservas manuales
    default:
      return 0;
  }
}
