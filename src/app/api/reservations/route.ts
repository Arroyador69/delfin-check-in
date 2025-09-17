import { NextRequest, NextResponse } from 'next/server';
import { getReservations, insertReservation, sql } from '@/lib/db';

// Configuración para evitar caché
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    console.log('📊 Obteniendo reservas desde PostgreSQL...');
    
    // Verificar si la tabla existe, si no, crearla
    try {
      await sql`SELECT 1 FROM reservations LIMIT 1`;
    } catch (error) {
      console.log('🔧 Tabla reservations no existe, creándola...');
      await sql`
        CREATE TABLE IF NOT EXISTS reservations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          external_id VARCHAR(100) UNIQUE NOT NULL,
          room_id VARCHAR(50) NOT NULL,
          guest_name VARCHAR(255) NOT NULL,
          guest_email VARCHAR(255),
          check_in TIMESTAMP NOT NULL,
          check_out TIMESTAMP NOT NULL,
          channel VARCHAR(50) DEFAULT 'manual',
          total_price DECIMAL(10,2) DEFAULT 0,
          guest_paid DECIMAL(10,2) DEFAULT 0,
          platform_commission DECIMAL(10,2) DEFAULT 0,
          net_income DECIMAL(10,2) DEFAULT 0,
          currency VARCHAR(3) DEFAULT 'EUR',
          status VARCHAR(50) DEFAULT 'confirmed',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      // Crear índices
      await sql`
        CREATE INDEX IF NOT EXISTS idx_reservations_check_in 
        ON reservations(check_in);
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_reservations_room_id 
        ON reservations(room_id);
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_reservations_external_id 
        ON reservations(external_id);
      `;
      
      console.log('✅ Tabla reservations creada correctamente');
    }
    
    // Obtener reservas desde la base de datos
    const reservations = await getReservations();
    console.log(`✅ Encontradas ${reservations.length} reservas`);
    
    return NextResponse.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    
    // Si no existe la tabla, devolver array vacío
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.log('⚠️ Tabla reservations no existe, devolviendo array vacío');
      return NextResponse.json([]);
    }
    
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

    // Preparar datos para insertar
    const reservationData = {
      external_id,
      room_id: body.room_id,
      guest_name: body.guest_name,
      guest_email: body.guest_email,
      check_in: body.check_in,
      check_out: body.check_out,
      channel: body.channel || 'manual',
      total_price,
      guest_paid,
      platform_commission,
      net_income,
      currency: body.currency || 'EUR',
      status: body.status || 'confirmed',
    };

    // Insertar en PostgreSQL usando la función helper
    const newReservation = await insertReservation(reservationData);
    console.log('✅ Reserva creada:', newReservation.id);

    return NextResponse.json(newReservation);
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
