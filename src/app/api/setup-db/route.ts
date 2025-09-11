import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Creando tabla guest_registrations...');
    
    // Crear la tabla si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS guest_registrations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        reserva_ref VARCHAR(50),
        fecha_entrada DATE NOT NULL,
        fecha_salida DATE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    // Crear índices
    await sql`
      CREATE INDEX IF NOT EXISTS idx_guest_registrations_fecha_entrada 
      ON guest_registrations(fecha_entrada);
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_guest_registrations_fecha_salida 
      ON guest_registrations(fecha_salida);
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_guest_registrations_created_at 
      ON guest_registrations(created_at);
    `;
    
    // Crear función para actualizar updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;
    
    // Crear trigger
    await sql`
      CREATE TRIGGER IF NOT EXISTS update_guest_registrations_updated_at 
      BEFORE UPDATE ON guest_registrations 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    console.log('✅ Tabla guest_registrations creada correctamente');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tabla guest_registrations creada correctamente' 
    });
    
  } catch (error) {
    console.error('❌ Error creando tabla:', error);
    return NextResponse.json({ 
      error: 'Error creando tabla',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
