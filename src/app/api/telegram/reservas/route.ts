import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/**
 * 🤖 API PARA TELEGRAM BOT - RESERVAS ESTRUCTURADAS
 * 
 * Devuelve reservas en formato estructurado para evitar alucinaciones de IA:
 * - alojados: huéspedes actualmente en el hotel
 * - llegan: check-ins de hoy
 * - salen: check-outs de hoy
 */

export async function GET(request: NextRequest) {
  try {
    // Obtener el token de autenticación de las cookies
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar el token JWT
    const payload = verifyToken(authToken);
    
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = payload.tenantId;
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    console.log(`🤖 Obteniendo reservas estructuradas para Telegram - Fecha: ${fecha}`);

    // Verificar que la tabla reservations existe
    try {
      await sql`SELECT 1 FROM reservations LIMIT 1`;
    } catch (error) {
      console.log('⚠️ Tabla reservations no existe');
      return NextResponse.json({
        fecha_consulta: fecha,
        alojados: [],
        llegan: [],
        salen: []
      });
    }

    // 🔹 Alojados el día X (excluyendo los que salen ese día)
    const alojadosResult = await sql`
      SELECT 
        guest_name as nombre,
        room_id as habitacion,
        guest_count as personas,
        check_in::date as check_in,
        check_out::date as check_out
      FROM reservations
      WHERE tenant_id = ${tenantId}
        AND status = 'confirmed'
        AND ${fecha}::date >= DATE(check_in)
        AND ${fecha}::date < DATE(check_out)
      ORDER BY check_in
    `;

    // 🔹 Llegadas (Check-in ese día)
    const lleganResult = await sql`
      SELECT 
        guest_name as nombre,
        room_id as habitacion,
        guest_count as personas,
        check_in::date as check_in,
        check_out::date as check_out
      FROM reservations
      WHERE tenant_id = ${tenantId}
        AND status = 'confirmed'
        AND DATE(check_in) = ${fecha}::date
      ORDER BY check_in
    `;

    // 🔹 Salidas (Check-out ese día)
    const salenResult = await sql`
      SELECT 
        guest_name as nombre,
        room_id as habitacion,
        guest_count as personas,
        check_in::date as check_in,
        check_out::date as check_out
      FROM reservations
      WHERE tenant_id = ${tenantId}
        AND status = 'confirmed'
        AND DATE(check_out) = ${fecha}::date
      ORDER BY check_in
    `;

    console.log(`✅ SQL directo: ${alojadosResult.rows.length} alojados, ${lleganResult.rows.length} llegan, ${salenResult.rows.length} salen`);

    // Validar y formatear datos
    const alojados = alojadosResult.rows.map(reserva => {
      if (!reserva.nombre || !reserva.habitacion) {
        console.warn('⚠️ Reserva alojada con datos incompletos:', reserva);
        return null;
      }
      return {
        nombre: reserva.nombre,
        habitacion: reserva.habitacion,
        personas: reserva.personas || 1,
        check_in: reserva.check_in,
        check_out: reserva.check_out
      };
    }).filter(Boolean);

    const llegan = lleganResult.rows.map(reserva => {
      if (!reserva.nombre || !reserva.habitacion) {
        console.warn('⚠️ Reserva llegada con datos incompletos:', reserva);
        return null;
      }
      return {
        nombre: reserva.nombre,
        habitacion: reserva.habitacion,
        personas: reserva.personas || 1,
        check_in: reserva.check_in,
        check_out: reserva.check_out
      };
    }).filter(Boolean);

    const salen = salenResult.rows.map(reserva => {
      if (!reserva.nombre || !reserva.habitacion) {
        console.warn('⚠️ Reserva salida con datos incompletos:', reserva);
        return null;
      }
      return {
        nombre: reserva.nombre,
        habitacion: reserva.habitacion,
        personas: reserva.personas || 1,
        check_in: reserva.check_in,
        check_out: reserva.check_out
      };
    }).filter(Boolean);

    const respuesta = {
      fecha_consulta: fecha,
      alojados,
      llegan,
      salen
    };

    console.log(`📊 Clasificación: ${alojados.length} alojados, ${llegan.length} llegan, ${salen.length} salen`);

    return NextResponse.json(respuesta);

  } catch (error) {
    console.error('❌ Error obteniendo reservas para Telegram:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
