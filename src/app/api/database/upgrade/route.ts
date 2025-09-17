import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Iniciando upgrade de base de datos...');

    // Verificar si las columnas ya existen
    const existingColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
    `;
    
    const columnNames = existingColumns.map(col => col.column_name);
    console.log('📋 Columnas existentes:', columnNames);

    // Añadir columnas faltantes una por una
    const newColumns = [
      { name: 'platform_commission', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'net_income', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'guest_paid', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'payment_method', type: 'VARCHAR(50)' },
      { name: 'booking_reference', type: 'VARCHAR(100)' },
      { name: 'guest_phone', type: 'VARCHAR(50)' },
      { name: 'guest_country', type: 'VARCHAR(100)' },
      { name: 'special_requests', type: 'TEXT' },
      { name: 'internal_notes', type: 'TEXT' }
    ];

    const addedColumns = [];
    
    for (const column of newColumns) {
      if (!columnNames.includes(column.name)) {
        try {
          await sql.unsafe(`ALTER TABLE reservations ADD COLUMN ${column.name} ${column.type}`);
          addedColumns.push(column.name);
          console.log(`✅ Añadida columna: ${column.name}`);
        } catch (error) {
          console.log(`⚠️ Columna ${column.name} ya existe o error:`, error);
        }
      }
    }

    // Crear índices
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_check_out ON reservations(check_out)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_channel ON reservations(channel)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_guest_name ON reservations(guest_name)'
    ];

    for (const indexQuery of indexes) {
      try {
        await sql.unsafe(indexQuery);
        console.log('✅ Índice creado');
      } catch (error) {
        console.log('⚠️ Índice ya existe:', error);
      }
    }

    // Crear función para calcular ganancia neta
    try {
      await sql`
        CREATE OR REPLACE FUNCTION calculate_net_income()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.net_income = COALESCE(NEW.total_price, 0) - COALESCE(NEW.platform_commission, 0);
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `;

      await sql`
        DROP TRIGGER IF EXISTS trigger_calculate_net_income ON reservations;
      `;

      await sql`
        CREATE TRIGGER trigger_calculate_net_income
            BEFORE INSERT OR UPDATE ON reservations
            FOR EACH ROW
            EXECUTE FUNCTION calculate_net_income();
      `;

      console.log('✅ Trigger de ganancia neta creado');
    } catch (error) {
      console.log('⚠️ Error creando trigger:', error);
    }

    // Verificar estructura final
    const finalColumns = await sql`
      SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      ORDER BY ordinal_position
    `;

    console.log('🎉 Upgrade completado');

    return NextResponse.json({
      success: true,
      message: 'Base de datos actualizada correctamente',
      addedColumns,
      totalColumns: finalColumns.length,
      structure: finalColumns
    });

  } catch (error) {
    console.error('❌ Error en upgrade de base de datos:', error);
    
    return NextResponse.json(
      { 
        error: 'Error actualizando base de datos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
