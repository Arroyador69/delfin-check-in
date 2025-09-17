import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    console.log('🔧 Iniciando setup de tabla reservations mejorada...');

    // Verificar si las columnas ya existen
    const existingColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
    `;
    
    const columnNames = existingColumns.map(col => col.column_name);
    console.log('📋 Columnas existentes:', columnNames);

    // Añadir columnas faltantes para el dashboard
    const newColumns = [
      { name: 'platform_commission', type: 'DECIMAL(10,2) DEFAULT 0', description: 'Comisión plataforma' },
      { name: 'net_income', type: 'DECIMAL(10,2) DEFAULT 0', description: 'Ganancia neta' },
      { name: 'guest_paid', type: 'DECIMAL(10,2) DEFAULT 0', description: 'Pago del huésped' },
      { name: 'payment_method', type: 'VARCHAR(50)', description: 'Método de pago' },
      { name: 'booking_reference', type: 'VARCHAR(100)', description: 'Referencia booking' },
      { name: 'guest_phone', type: 'VARCHAR(50)', description: 'Teléfono huésped' },
      { name: 'guest_country', type: 'VARCHAR(100)', description: 'País huésped' },
      { name: 'special_requests', type: 'TEXT', description: 'Peticiones especiales' },
      { name: 'internal_notes', type: 'TEXT', description: 'Notas internas' }
    ];

    const addedColumns = [];
    const errors = [];
    
    for (const column of newColumns) {
      if (!columnNames.includes(column.name)) {
        try {
          await sql.unsafe(`ALTER TABLE reservations ADD COLUMN ${column.name} ${column.type}`);
          addedColumns.push(`${column.name} (${column.description})`);
          console.log(`✅ Añadida columna: ${column.name} - ${column.description}`);
        } catch (error: any) {
          const errorMsg = `Error añadiendo ${column.name}: ${error.message}`;
          errors.push(errorMsg);
          console.log(`⚠️ ${errorMsg}`);
        }
      } else {
        console.log(`⏭️ Columna ${column.name} ya existe`);
      }
    }

    // Crear índices para mejorar rendimiento
    const indexes = [
      { query: 'CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in)', name: 'check_in' },
      { query: 'CREATE INDEX IF NOT EXISTS idx_reservations_check_out ON reservations(check_out)', name: 'check_out' },
      { query: 'CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)', name: 'status' },
      { query: 'CREATE INDEX IF NOT EXISTS idx_reservations_channel ON reservations(channel)', name: 'channel' },
      { query: 'CREATE INDEX IF NOT EXISTS idx_reservations_guest_name ON reservations(guest_name)', name: 'guest_name' }
    ];

    const addedIndexes = [];
    for (const index of indexes) {
      try {
        await sql.unsafe(index.query);
        addedIndexes.push(index.name);
        console.log(`✅ Índice creado: ${index.name}`);
      } catch (error: any) {
        console.log(`⚠️ Índice ${index.name}:`, error.message);
      }
    }

    // Crear función para calcular ganancia neta automáticamente
    try {
      await sql`
        CREATE OR REPLACE FUNCTION calculate_net_income()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Calcular ganancia neta = precio total - comisión plataforma
            NEW.net_income = COALESCE(NEW.total_price, 0) - COALESCE(NEW.platform_commission, 0);
            
            -- Si guest_paid no está definido, usar total_price
            IF NEW.guest_paid IS NULL OR NEW.guest_paid = 0 THEN
                NEW.guest_paid = NEW.total_price;
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `;

      await sql`DROP TRIGGER IF EXISTS trigger_calculate_net_income ON reservations`;

      await sql`
        CREATE TRIGGER trigger_calculate_net_income
            BEFORE INSERT OR UPDATE ON reservations
            FOR EACH ROW
            EXECUTE FUNCTION calculate_net_income();
      `;

      console.log('✅ Trigger de ganancia neta creado');
    } catch (error: any) {
      errors.push(`Error creando trigger: ${error.message}`);
      console.log('⚠️ Error creando trigger:', error.message);
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

    console.log('🎉 Setup de reservations completado');

    return NextResponse.json({
      success: true,
      message: 'Base de datos actualizada correctamente para dashboard de reservas',
      addedColumns,
      addedIndexes,
      errors,
      totalColumns: finalColumns.length,
      structure: finalColumns.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable,
        default: col.column_default
      }))
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('❌ Error en setup de base de datos:', error);
    
    return NextResponse.json(
      { 
        error: 'Error actualizando base de datos',
        details: error.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
