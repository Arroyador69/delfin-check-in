import { NextRequest, NextResponse } from 'next/server';
import { getReservations, insertReservation, sql, normalizeRoomId } from '@/lib/db';
import { sendReservationConfirmation } from '@/lib/whatsapp';

// Configuración para evitar caché
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Obteniendo reservas desde PostgreSQL...');
    
    // Obtener tenant_id del header (enviado por el middleware)
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }
    
    // Verificar que tenemos conexión a Neon DB
    if (!process.env.POSTGRES_URL) {
      console.log('❌ No hay POSTGRES_URL configurado');
      return NextResponse.json(
        { error: 'Base de datos no configurada' },
        { status: 500 }
      );
    }
    
    console.log('✅ Usando Neon DB (Vercel Postgres)');
    
    // Verificar si la tabla Room existe (solo verificar, no crear)
    try {
      await sql`SELECT 1 FROM "Room" LIMIT 1`;
    } catch (error) {
      console.log('⚠️ Tabla Room no existe. Debes crearla manualmente en la base de datos.');
      return NextResponse.json([]); // Devolver array vacío en lugar de error
    }
    
    // Verificar si la tabla reservations existe, si no, crearla
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
          guest_phone VARCHAR(50),
          guest_count INTEGER DEFAULT 1 CHECK (guest_count > 0),
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
    
    // Obtener reservas desde la base de datos filtradas por tenant_id
    const result = await sql`
      SELECT * FROM reservations 
      WHERE tenant_id = ${tenantId}
      ORDER BY check_in DESC
    `;
    
    console.log(`✅ Encontradas ${result.rows.length} reservas para tenant ${tenantId}`);
    
    return NextResponse.json(result.rows);
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
    
    // Obtener tenant_id del header (enviado por el middleware)
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 400 }
      );
    }
    
    // PRIMERO: Verificar si la tabla Room existe (solo verificar, no crear)
    try {
      await sql`SELECT 1 FROM "Room" LIMIT 1`;
      console.log('✅ Tabla Room existe');
    } catch (error) {
      console.log('⚠️ Tabla Room no existe. Debes crearla manualmente en la base de datos.');
      return NextResponse.json(
        { error: 'La tabla Room no existe. Contacta al administrador.' },
        { status: 500 }
      );
    }

    // SEGUNDO: Verificar si la tabla reservations existe, si no, crearla
    try {
      await sql`SELECT 1 FROM reservations LIMIT 1`;
      console.log('✅ Tabla reservations existe');
    } catch (error) {
      console.log('🔧 Tabla reservations no existe, creándola...');
      await sql`
        CREATE TABLE IF NOT EXISTS reservations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          external_id VARCHAR(100) UNIQUE NOT NULL,
          room_id VARCHAR(50) NOT NULL,
          guest_name VARCHAR(255) NOT NULL,
          guest_email VARCHAR(255),
          guest_phone VARCHAR(50),
          guest_count INTEGER DEFAULT 1 CHECK (guest_count > 0),
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

    // Normalizar room_id a número simple (1-6)
    const normalizedRoomId = normalizeRoomId(body.room_id);
    console.log(`🏠 Normalizando room_id: ${body.room_id} → ${normalizedRoomId}`);

    // Preparar datos para insertar
    const reservationData = {
      external_id,
      room_id: normalizedRoomId,
      guest_name: body.guest_name,
      guest_email: body.guest_email,
      guest_phone: body.guest_phone,
      guest_count: parseInt(body.guest_count) || 1,
      check_in: body.check_in,
      check_out: body.check_out,
      channel: body.channel || 'manual',
      total_price,
      guest_paid,
      platform_commission,
      net_income,
      currency: body.currency || 'EUR',
      status: body.status || 'confirmed',
      tenant_id: tenantId, // Añadir tenant_id
    };

    // Insertar en PostgreSQL directamente con tenant_id
    const result = await sql`
      INSERT INTO reservations (
        external_id, room_id, guest_name, guest_email, guest_phone, 
        guest_count, check_in, check_out, channel, total_price, 
        guest_paid, platform_commission, net_income, currency, status, tenant_id
      ) VALUES (
        ${reservationData.external_id},
        ${reservationData.room_id},
        ${reservationData.guest_name},
        ${reservationData.guest_email},
        ${reservationData.guest_phone},
        ${reservationData.guest_count},
        ${reservationData.check_in}::timestamp,
        ${reservationData.check_out}::timestamp,
        ${reservationData.channel},
        ${reservationData.total_price},
        ${reservationData.guest_paid},
        ${reservationData.platform_commission},
        ${reservationData.net_income},
        ${reservationData.currency},
        ${reservationData.status},
        ${reservationData.tenant_id}
      ) RETURNING *
    `;
    
    const newReservation = result.rows[0];
    console.log('✅ Reserva creada:', newReservation.id);

    // Enviar mensaje de confirmación por WhatsApp si hay teléfono
    if (body.guest_phone) {
      try {
        console.log('📱 Enviando mensaje de confirmación por WhatsApp...');
        const whatsappResult = await sendReservationConfirmation({
          id: newReservation.id,
          guest_name: body.guest_name,
          guest_phone: body.guest_phone,
          guest_email: body.guest_email,
          room_id: body.room_id,
          check_in: body.check_in,
          check_out: body.check_out,
          guest_count: parseInt(body.guest_count) || 1
        });
        
        if (whatsappResult.success) {
          console.log('✅ Mensaje de WhatsApp enviado exitosamente');
        } else {
          console.log('⚠️ Error enviando WhatsApp:', whatsappResult.error);
        }
      } catch (whatsappError) {
        console.error('❌ Error en envío de WhatsApp:', whatsappError);
        // No fallar la creación de reserva por error de WhatsApp
      }
    }

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
export async function PUT(request: NextRequest) {
  try {
    console.log('📝 Actualizando reserva en PostgreSQL...');
    
    const body = await request.json();
    console.log('📋 Datos recibidos para actualización:', body);
    
    // Validar datos requeridos
    if (!body.id || !body.guest_name || !body.room_id || !body.check_in || !body.check_out) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: id, guest_name, room_id, check_in, check_out' },
        { status: 400 }
      );
    }

    // Normalizar room_id a número simple (1-6)
    const normalizedRoomId = normalizeRoomId(body.room_id);
    console.log(`🏠 Normalizando room_id en actualización: ${body.room_id} → ${normalizedRoomId}`);

    // Calcular datos financieros
    const total_price = parseFloat(body.total_price) || 0;
    const guest_paid = parseFloat(body.guest_paid) || total_price;
    const platform_commission = parseFloat(body.platform_commission) || calculateCommission(guest_paid, body.channel || 'manual');
    const net_income = guest_paid - platform_commission;

    // Actualizar la reserva
    const result = await sql`
      UPDATE reservations 
      SET 
        room_id = ${normalizedRoomId},
        guest_name = ${body.guest_name},
        guest_email = ${body.guest_email || ''},
        guest_phone = ${body.guest_phone || ''},
        guest_count = ${parseInt(body.guest_count) || 1},
        check_in = ${body.check_in}::timestamp,
        check_out = ${body.check_out}::timestamp,
        channel = ${body.channel || 'manual'},
        total_price = ${total_price},
        guest_paid = ${guest_paid},
        platform_commission = ${platform_commission},
        net_income = ${net_income},
        currency = ${body.currency || 'EUR'},
        status = ${body.status || 'confirmed'},
        updated_at = NOW()
      WHERE id = ${body.id}
      RETURNING *;
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ Reserva actualizada:', result.rows[0].id);
    return NextResponse.json(result.rows[0]);
    
  } catch (error: any) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la reserva', details: error.message },
      { status: 500 }
    );
  }
}

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
