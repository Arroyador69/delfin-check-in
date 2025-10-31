// =====================================================
// SCRIPT DE VERIFICACIÓN DE CONEXIONES MULTITENANT EN VERCEL
// =====================================================

import { sql } from '@vercel/postgres';

export async function verifyMultitenantConnections() {
  try {
    console.log('🔍 Verificando conexiones multitentant en Vercel Postgres...');

    // 1. Verificar que las tablas existen
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'tenant_properties', 
          'direct_reservations', 
          'commission_transactions', 
          'property_availability',
          'tenant_commission_settings'
        )
      ORDER BY table_name;
    `;

    console.log('✅ Tablas encontradas:', tablesCheck.rows.map(r => r.table_name));

    // 2. Verificar estructura de tenant_properties
    const tenantPropertiesStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tenant_properties'
      ORDER BY ordinal_position;
    `;

    console.log('📋 Estructura tenant_properties:', tenantPropertiesStructure.rows);

    // 3. Verificar foreign keys
    const foreignKeys = await sql`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name IN ('tenant_properties', 'direct_reservations', 'commission_transactions', 'property_availability')
      ORDER BY tc.table_name, kcu.column_name;
    `;

    console.log('🔗 Foreign keys encontradas:', foreignKeys.rows);

    // 4. Verificar índices multitentant
    const indexes = await sql`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('tenant_properties', 'direct_reservations', 'commission_transactions', 'property_availability')
        AND indexname LIKE '%tenant%'
      ORDER BY tablename, indexname;
    `;

    console.log('📊 Índices multitentant:', indexes.rows);

    // 5. Verificar funciones
    const functions = await sql`
      SELECT 
        routine_name,
        routine_type
      FROM information_schema.routines 
      WHERE routine_name IN ('generate_reservation_code', 'calculate_commission', 'update_updated_at_column')
      ORDER BY routine_name;
    `;

    console.log('⚙️ Funciones encontradas:', functions.rows);

    // 6. Verificar datos de prueba (si existen)
    const tenantCount = await sql`SELECT COUNT(*) as count FROM tenants;`;
    const propertiesCount = await sql`SELECT COUNT(*) as count FROM tenant_properties;`;
    const reservationsCount = await sql`SELECT COUNT(*) as count FROM direct_reservations;`;

    console.log('📈 Datos actuales:');
    console.log(`  - Tenants: ${tenantCount.rows[0].count}`);
    console.log(`  - Propiedades: ${propertiesCount.rows[0].count}`);
    console.log(`  - Reservas: ${reservationsCount.rows[0].count}`);

    // 7. Verificar configuración de comisiones
    const commissionSettings = await sql`
      SELECT 
        tenant_id,
        commission_rate,
        stripe_fee_rate,
        minimum_commission,
        is_active
      FROM tenant_commission_settings
      ORDER BY created_at DESC
      LIMIT 5;
    `;

    console.log('💰 Configuración de comisiones:', commissionSettings.rows);

    return {
      success: true,
      message: 'Verificación completada exitosamente',
      data: {
        tables: tablesCheck.rows,
        foreignKeys: foreignKeys.rows,
        indexes: indexes.rows,
        functions: functions.rows,
        counts: {
          tenants: tenantCount.rows[0].count,
          properties: propertiesCount.rows[0].count,
          reservations: reservationsCount.rows[0].count
        },
        commissionSettings: commissionSettings.rows
      }
    };

  } catch (error) {
    console.error('❌ Error verificando conexiones:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Función para probar inserción de datos de prueba
export async function testMultitenantInsertion() {
  try {
    console.log('🧪 Probando inserción multitentant...');

    // Crear tenant de prueba si no existe
    const testTenantId = 'test-tenant-' + Date.now();
    
    await sql`
      INSERT INTO tenants (id, name, email, plan_id, max_rooms)
      VALUES (${testTenantId}, 'Test Tenant', 'test@example.com', 'basic', 6)
      ON CONFLICT (id) DO NOTHING;
    `;

    // Crear propiedad de prueba
    const propertyResult = await sql`
      INSERT INTO tenant_properties (
        tenant_id, property_name, description, max_guests, 
        bedrooms, bathrooms, base_price, is_active
      ) VALUES (
        ${testTenantId}, 'Apartamento de Prueba', 'Descripción de prueba',
        4, 2, 1, 80.00, true
      )
      RETURNING id;
    `;

    const propertyId = propertyResult.rows[0].id;

    // Crear reserva de prueba
    const reservationResult = await sql`
      INSERT INTO direct_reservations (
        tenant_id, property_id, reservation_code, guest_name, guest_email,
        check_in_date, check_out_date, nights, guests, base_price,
        subtotal, delfin_commission_amount, property_owner_amount, total_amount,
        payment_status, reservation_status
      ) VALUES (
        ${testTenantId}, ${propertyId}, ${'TEST-' + Date.now()},
        'Huésped de Prueba', 'guest@example.com',
        '2024-02-01', '2024-02-03', 2, 2, 80.00,
        160.00, 14.40, 145.60, 160.00,
        'paid', 'confirmed'
      )
      RETURNING id;
    `;

    console.log('✅ Datos de prueba insertados correctamente');
    console.log(`  - Tenant ID: ${testTenantId}`);
    console.log(`  - Property ID: ${propertyId}`);
    console.log(`  - Reservation ID: ${reservationResult.rows[0].id}`);

    // Limpiar datos de prueba
    await sql`DELETE FROM direct_reservations WHERE tenant_id = ${testTenantId};`;
    await sql`DELETE FROM tenant_properties WHERE tenant_id = ${testTenantId};`;
    await sql`DELETE FROM tenants WHERE id = ${testTenantId};`;

    console.log('🧹 Datos de prueba eliminados');

    return {
      success: true,
      message: 'Prueba de inserción multitentant exitosa'
    };

  } catch (error) {
    console.error('❌ Error en prueba de inserción:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}







