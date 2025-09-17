#!/usr/bin/env node

/**
 * Script para actualizar la base de datos PostgreSQL con campos de reservas
 * Ejecutar: node upgrade-database.js
 */

import { sql } from './src/lib/db.js';

async function upgradeDatabase() {
  try {
    console.log('🔧 Iniciando upgrade de base de datos PostgreSQL...\n');

    // 1. Verificar columnas existentes
    console.log('📋 Verificando estructura actual...');
    const existingColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
    `;
    
    const columnNames = existingColumns.map(col => col.column_name);
    console.log('✅ Columnas existentes:', columnNames.length);

    // 2. Añadir columnas faltantes
    console.log('\n🔧 Añadiendo campos para dashboard de reservas...');
    
    const newColumns = [
      { name: 'platform_commission', type: 'DECIMAL(10,2) DEFAULT 0', description: 'Comisión plataforma (Airbnb, Booking)' },
      { name: 'net_income', type: 'DECIMAL(10,2) DEFAULT 0', description: 'Ganancia neta (auto-calculada)' },
      { name: 'guest_paid', type: 'DECIMAL(10,2) DEFAULT 0', description: 'Cantidad pagada por huésped' },
      { name: 'payment_method', type: 'VARCHAR(50)', description: 'Método de pago (tarjeta, efectivo, etc.)' },
      { name: 'booking_reference', type: 'VARCHAR(100)', description: 'Referencia externa de la reserva' },
      { name: 'guest_phone', type: 'VARCHAR(50)', description: 'Teléfono del huésped' },
      { name: 'guest_country', type: 'VARCHAR(100)', description: 'País del huésped' },
      { name: 'special_requests', type: 'TEXT', description: 'Peticiones especiales del huésped' },
      { name: 'internal_notes', type: 'TEXT', description: 'Notas internas del administrador' }
    ];

    const addedColumns = [];
    
    for (const column of newColumns) {
      if (!columnNames.includes(column.name)) {
        try {
          await sql.unsafe(`ALTER TABLE reservations ADD COLUMN ${column.name} ${column.type}`);
          addedColumns.push(column.name);
          console.log(`✅ Añadida: ${column.name} - ${column.description}`);
        } catch (error) {
          console.log(`⚠️ Error con ${column.name}:`, error.message);
        }
      } else {
        console.log(`⏭️ Ya existe: ${column.name}`);
      }
    }

    // 3. Crear índices para mejorar rendimiento
    console.log('\n📈 Creando índices para rendimiento...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_check_out ON reservations(check_out)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_channel ON reservations(channel)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_guest_name ON reservations(guest_name)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_guest_country ON reservations(guest_country)'
    ];

    for (const indexQuery of indexes) {
      try {
        await sql.unsafe(indexQuery);
        console.log('✅ Índice creado');
      } catch (error) {
        console.log('⚠️ Índice ya existe');
      }
    }

    // 4. Crear función para calcular ganancia neta automáticamente
    console.log('\n⚙️ Creando función de cálculo automático...');
    
    try {
      await sql`
        CREATE OR REPLACE FUNCTION calculate_net_income()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Calcular ganancia neta = precio total - comisión plataforma
            NEW.net_income = COALESCE(NEW.total_price, 0) - COALESCE(NEW.platform_commission, 0);
            
            -- Si guest_paid no está definido, usar total_price por defecto
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

      console.log('✅ Trigger de cálculo automático creado');
    } catch (error) {
      console.log('⚠️ Error creando trigger:', error.message);
    }

    // 5. Verificar estructura final
    console.log('\n📊 Verificando estructura final...');
    
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

    console.log(`\n🎉 UPGRADE COMPLETADO EXITOSAMENTE!`);
    console.log(`📊 Columnas añadidas: ${addedColumns.length}`);
    console.log(`📋 Total columnas: ${finalColumns.length}`);
    
    if (addedColumns.length > 0) {
      console.log('\n✅ Nuevas columnas añadidas:');
      addedColumns.forEach(col => console.log(`   • ${col}`));
    }

    console.log('\n🎯 Tu tabla reservations ahora incluye:');
    console.log('   • Datos básicos (huésped, fechas, habitación)');
    console.log('   • Información financiera (precios, comisiones, ganancia)');
    console.log('   • Datos de contacto (teléfono, país)');
    console.log('   • Gestión interna (notas, peticiones especiales)');
    console.log('   • Cálculos automáticos (ganancia neta)');
    
    console.log('\n🚀 Próximo paso: Ve a https://admin.delfincheckin.com/database-manager');

  } catch (error) {
    console.error('\n❌ ERROR DURANTE EL UPGRADE:', error);
    console.error('Detalles:', error.message);
    process.exit(1);
  }
}

// Ejecutar upgrade
upgradeDatabase().then(() => {
  console.log('\n✅ Script completado exitosamente');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Error fatal:', error);
  process.exit(1);
});
