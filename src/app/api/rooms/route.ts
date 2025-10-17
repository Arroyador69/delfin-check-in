import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    const result = await sql`
      SELECT id, name
      FROM "Room"
      WHERE "lodgingId" = (
        SELECT lodging_id FROM tenants WHERE id = ${tenantId}
      )
      ORDER BY id ASC
    `;

    const rooms = result.rows.map(row => ({
      id: parseInt(row.id),
      name: row.name,
      value: row.name
    }));

    return NextResponse.json({
      success: true,
      rooms: rooms
    });

  } catch (error) {
    console.error('Error obteniendo habitaciones:', error);
    
    // Fallback a habitaciones por defecto si hay error
    const defaultRooms = [
      { id: 1, name: 'Habitación 1', value: 'Habitación 1' },
      { id: 2, name: 'Habitación 2', value: 'Habitación 2' },
      { id: 3, name: 'Habitación 3', value: 'Habitación 3' },
      { id: 4, name: 'Habitación 4', value: 'Habitación 4' },
      { id: 5, name: 'Habitación 5', value: 'Habitación 5' },
      { id: 6, name: 'Habitación 6', value: 'Habitación 6' }
    ];
    
    return NextResponse.json({
      success: true,
      rooms: defaultRooms
    });
  }
}