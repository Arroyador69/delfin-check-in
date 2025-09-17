import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Obteniendo estadísticas de base de datos...');

    // Obtener estadísticas de todas las tablas
    const [roomsCount, reservationsCount, guestsCount, registrationsCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM rooms`,
      sql`SELECT COUNT(*) as count FROM reservations`,
      sql`SELECT COUNT(*) as count FROM guests`,
      sql`SELECT COUNT(*) as count FROM guest_registrations`
    ]);

    const stats = {
      rooms: parseInt(roomsCount[0].count),
      reservations: parseInt(reservationsCount[0].count),
      guests: parseInt(guestsCount[0].count),
      registrations: parseInt(registrationsCount[0].count),
      timestamp: new Date().toISOString()
    };

    console.log('✅ Estadísticas obtenidas:', stats);

    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas de base de datos' },
      { status: 500 }
    );
  }
}
