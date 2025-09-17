import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    console.log('🔧 UPGRADE DE BASE DE DATOS INICIADO...');

    // 1. Verificar columnas existentes
    const existingColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
    `;
    
    const columnNames = existingColumns.map(col => col.column_name);
    console.log('📋 Columnas existentes:', columnNames);

    // 2. Añadir columnas para dashboard de reservas
    const newColumns = [
      'platform_commission DECIMAL(10,2) DEFAULT 0',
      'net_income DECIMAL(10,2) DEFAULT 0', 
      'guest_paid DECIMAL(10,2) DEFAULT 0',
      'payment_method VARCHAR(50)',
      'booking_reference VARCHAR(100)',
      'guest_phone VARCHAR(50)',
      'guest_country VARCHAR(100)',
      'special_requests TEXT',
      'internal_notes TEXT'
    ];

    const results = [];
    
    for (const columnDef of newColumns) {
      const columnName = columnDef.split(' ')[0];
      
      if (!columnNames.includes(columnName)) {
        try {
          await sql.unsafe(`ALTER TABLE reservations ADD COLUMN ${columnDef}`);
          results.push(`✅ Añadida: ${columnName}`);
          console.log(`✅ Añadida columna: ${columnName}`);
        } catch (error: any) {
          results.push(`⚠️ Error: ${columnName} - ${error.message}`);
        }
      } else {
        results.push(`⏭️ Ya existe: ${columnName}`);
      }
    }

    // 3. Crear índices
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_channel ON reservations(channel)'
    ];

    for (const indexQuery of indexes) {
      try {
        await sql.unsafe(indexQuery);
        results.push('✅ Índice creado');
      } catch (error) {
        results.push('⚠️ Índice ya existe');
      }
    }

    // 4. Crear trigger para cálculo automático
    try {
      await sql`
        CREATE OR REPLACE FUNCTION calculate_net_income()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.net_income = COALESCE(NEW.total_price, 0) - COALESCE(NEW.platform_commission, 0);
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
      
      results.push('✅ Trigger de cálculo automático creado');
    } catch (error: any) {
      results.push(`⚠️ Error trigger: ${error.message}`);
    }

    // 5. Verificar estructura final
    const finalColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      ORDER BY ordinal_position
    `;

    console.log('\n🎉 UPGRADE COMPLETADO!');
    console.log(`📊 Total columnas: ${finalColumns.length}`);

    return NextResponse.json({
      success: true,
      message: 'Base de datos actualizada correctamente',
      results,
      totalColumns: finalColumns.length,
      columns: finalColumns.map(col => `${col.column_name} (${col.data_type})`)
    });

  } catch (error: any) {
    console.error('❌ ERROR:', error);
    
    return NextResponse.json({
      error: 'Error en upgrade',
      details: error.message
    }, { status: 500 });
  }
}

export { GET as POST };
