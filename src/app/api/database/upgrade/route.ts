import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Iniciando actualización de la base de datos...');
    
    // Ejecutar las actualizaciones directamente
    await sql`
      -- Añadir columna guest_phone si no existe
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'reservations' 
                         AND column_name = 'guest_phone') THEN
              ALTER TABLE reservations ADD COLUMN guest_phone VARCHAR(50);
          END IF;
      END $$;
    `;
    
    await sql`
      -- Añadir columna guest_count si no existe
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'reservations' 
                         AND column_name = 'guest_count') THEN
              ALTER TABLE reservations ADD COLUMN guest_count INTEGER DEFAULT 1 CHECK (guest_count > 0);
          END IF;
      END $$;
    `;
    
    await sql`
      -- Actualizar registros existentes que tengan guest_count NULL
      UPDATE reservations 
      SET guest_count = 1 
      WHERE guest_count IS NULL;
    `;
    
    console.log('✅ Base de datos actualizada correctamente');
    
    return NextResponse.json({
      success: true,
      message: 'Base de datos actualizada correctamente. Se añadieron los campos guest_phone y guest_count.'
    });
    
  } catch (error: any) {
    console.error('❌ Error actualizando la base de datos:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error al actualizar la base de datos',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Verificar el estado de las columnas
    const result = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      AND column_name IN ('guest_phone', 'guest_count')
      ORDER BY column_name;
    `;
    
    return NextResponse.json({
      success: true,
      columns: result.rows,
      message: result.rows.length === 2 ? 
        'Los campos guest_phone y guest_count ya están presentes en la base de datos' :
        'Faltan algunos campos. Ejecuta POST para actualizar la base de datos.'
    });
    
  } catch (error: any) {
    console.error('❌ Error verificando la base de datos:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error al verificar la base de datos',
      error: error.message
    }, { status: 500 });
  }
}
