import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    console.log('📊 Obteniendo reservas desde PostgreSQL...');
    
    // Obtener todas las reservas con información de habitación
    const reservations = await sql`
      SELECT 
        r.*,
        rm.name as room_name
      FROM reservations r
      LEFT JOIN rooms rm ON rm.id = r.room_id
      ORDER BY r.check_in DESC
    `;
    
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
    console.log('📝 Creando nueva reserva en PostgreSQL...');
    
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

    // Generar external_id único
    const external_id = body.external_id || `manual_${Date.now()}`;

    // Insertar en PostgreSQL
    const result = await sql`
      INSERT INTO reservations (
        external_id,
        room_id,
        guest_name,
        guest_email,
        check_in,
        check_out,
        channel,
        total_price,
        status
      ) VALUES (
        ${external_id},
        ${body.room_id},
        ${body.guest_name},
        ${body.guest_email || ''},
        ${body.check_in}::timestamp,
        ${body.check_out}::timestamp,
        ${body.channel || 'manual'},
        ${total_price},
        ${body.status || 'confirmed'}
      )
      RETURNING *
    `;

    const newReservation = (result as any)[0];
    console.log('✅ Reserva creada:', newReservation.id);

    return NextResponse.json({
      ...newReservation,
      guest_paid,
      platform_commission,
      net_income
    });
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
