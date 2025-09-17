import { NextRequest, NextResponse } from 'next/server';
import { getReservations, createReservation } from '@/lib/storage';

export async function GET() {
  try {
    console.log('📊 Obteniendo reservas...');
    const reservations = getReservations();
    console.log(`✅ Encontradas ${reservations.length} reservas`);
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
    console.log('📝 Creando nueva reserva...');
    
    const body = await request.json();
    console.log('📋 Datos recibidos:', body);
    
    // Validar datos requeridos
    if (!body.guest_name || !body.room_id || !body.check_in || !body.check_out) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: guest_name, room_id, check_in, check_out' },
        { status: 400 }
      );
    }

    // Calcular datos financieros
    const total_price = parseFloat(body.total_price) || 0;
    const guest_paid = parseFloat(body.guest_paid) || total_price;
    const platform_commission = parseFloat(body.platform_commission) || calculateCommission(guest_paid, body.channel || 'manual');
    const net_income = guest_paid - platform_commission;

    const reservation = {
      id: `res_${Date.now()}`,
      external_id: body.external_id || `manual_${Date.now()}`,
      room_id: body.room_id,
      guest_name: body.guest_name,
      guest_email: body.guest_email || '',
      check_in: body.check_in,
      check_out: body.check_out,
      channel: body.channel || 'manual',
      total_price,
      guest_paid,
      platform_commission,
      net_income,
      currency: body.currency || 'EUR',
      status: body.status || 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Guardar en almacenamiento (temporalmente hasta arreglar PostgreSQL)
    createReservation(reservation);
    console.log('✅ Reserva creada:', reservation.id);

    return NextResponse.json(reservation);
  } catch (error: any) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Error al crear la reserva', details: error.message },
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
