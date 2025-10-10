import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  try {
    console.log('🏠 Creando tabla rooms...');
    
    // Crear tabla rooms
    await sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        base_price DECIMAL(10,2) DEFAULT 0,
        description TEXT,
        capacity INTEGER DEFAULT 2,
        amenities TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    // Insertar habitaciones de ejemplo si no existen
    const existingRooms = await sql`SELECT COUNT(*) as count FROM "Room"`;
    
    if (existingRooms.rows[0].count === '0') {
      console.log('🏠 Insertando habitaciones de ejemplo...');
      
      await sql`
        INSERT INTO rooms (id, name, base_price, description, capacity, amenities) VALUES
        ('room-001', 'Habitación Doble Estándar', 80.00, 'Habitación doble con baño privado', 2, ARRAY['WiFi', 'TV', 'Aire acondicionado']),
        ('room-002', 'Habitación Individual', 60.00, 'Habitación individual con baño privado', 1, ARRAY['WiFi', 'TV', 'Aire acondicionado']),
        ('room-003', 'Suite Familiar', 120.00, 'Suite espaciosa para familias', 4, ARRAY['WiFi', 'TV', 'Aire acondicionado', 'Minibar', 'Balcón']),
        ('room-004', 'Habitación Vista al Mar', 100.00, 'Habitación con vista panorámica al mar', 2, ARRAY['WiFi', 'TV', 'Aire acondicionado', 'Balcón', 'Vista al mar'])
        ON CONFLICT (id) DO NOTHING;
      `;
      
      console.log('✅ Habitaciones de ejemplo insertadas');
    }
    
    // Crear índices
    await sql`
      CREATE INDEX IF NOT EXISTS idx_rooms_name ON rooms(name);
    `;
    
    console.log('✅ Tabla rooms creada correctamente');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tabla rooms creada correctamente' 
    });
  } catch (error) {
    console.error('Error creating rooms table:', error);
    return NextResponse.json(
      { error: 'Error al crear la tabla rooms', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
