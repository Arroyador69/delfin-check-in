// =====================================================
// SCRIPT: Crear usuario de prueba para AppConnect
// =====================================================
// Este script crea un usuario de prueba en la base de datos
// para que el equipo de AppConnect pueda probar la app móvil

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuración
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const TEST_EMAIL = 'appconnect-test@delfincheckin.com';
const TEST_PASSWORD = 'AppConnect2024!';
const TEST_ROLE = 'owner';

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL o POSTGRES_URL no está definida');
  console.log('\n💡 OPCIONES PARA OBTENER LA DATABASE_URL:');
  console.log('\n1. Desde Vercel (si está desplegado):');
  console.log('   - Ve a tu proyecto en Vercel');
  console.log('   - Settings > Environment Variables');
  console.log('   - Copia el valor de POSTGRES_URL o DATABASE_URL');
  console.log('\n2. Desde Neon:');
  console.log('   - Ve a tu proyecto en Neon (https://console.neon.tech)');
  console.log('   - Selecciona tu base de datos');
  console.log('   - Copia la Connection String');
  console.log('\n3. Ejecuta el script con:');
  console.log('   DATABASE_URL="postgresql://..." node scripts/create-test-user.js');
  console.log('\n4. O usa el script alternativo con API (requiere tenant_id):');
  console.log('   TENANT_ID="uuid" node scripts/create-test-user-api.js');
  process.exit(1);
}

async function createTestUser() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });
  
  try {
    console.log('🔍 Buscando tenant existente...');
    
    // Buscar el primer tenant activo o crear uno de prueba
    const tenantResult = await pool.query(`
      SELECT id, name, email 
      FROM tenants 
      WHERE status = 'active' 
      ORDER BY created_at ASC 
      LIMIT 1
    `);
    
    let tenantId;
    let tenantName;
    
    if (tenantResult.rows.length === 0) {
      console.log('⚠️  No se encontró ningún tenant. Creando tenant de prueba...');
      
      // Crear tenant de prueba
      const newTenantResult = await pool.query(`
        INSERT INTO tenants (
          name, email, plan_id, status, max_rooms, current_rooms
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )
        RETURNING id, name
      `, [
        'Tenant de Prueba AppConnect',
        TEST_EMAIL,
        'basic',
        'active',
        10,
        0
      ]);
      
      tenantId = newTenantResult.rows[0].id;
      tenantName = newTenantResult.rows[0].name;
      console.log(`✅ Tenant creado: ${tenantName} (${tenantId})`);
    } else {
      tenantId = tenantResult.rows[0].id;
      tenantName = tenantResult.rows[0].name;
      console.log(`✅ Usando tenant existente: ${tenantName} (${tenantId})`);
    }
    
    // Verificar si el usuario ya existe
    console.log('🔍 Verificando si el usuario ya existe...');
    const existingUserResult = await pool.query(`
      SELECT id, email 
      FROM tenant_users 
      WHERE tenant_id = $1 AND email = $2
    `, [tenantId, TEST_EMAIL]);
    
    if (existingUserResult.rows.length > 0) {
      console.log('⚠️  El usuario ya existe. Actualizando contraseña...');
      
      // Actualizar contraseña
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
      await pool.query(`
        UPDATE tenant_users
        SET 
          password_hash = $1,
          is_active = true,
          email_verified = true,
          updated_at = NOW()
        WHERE id = $2
      `, [passwordHash, existingUserResult.rows[0].id]);
      
      console.log('✅ Usuario actualizado correctamente');
    } else {
      console.log('📝 Creando nuevo usuario...');
      
      // Hashear contraseña
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
      
      // Crear usuario
      const newUserResult = await pool.query(`
        INSERT INTO tenant_users (
          tenant_id, 
          email, 
          password_hash, 
          role, 
          is_active, 
          email_verified,
          full_name
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
        RETURNING id, email, role
      `, [
        tenantId,
        TEST_EMAIL,
        passwordHash,
        TEST_ROLE,
        true,
        true,
        'Usuario de Prueba AppConnect'
      ]);
      
      console.log('✅ Usuario creado correctamente');
    }
    
    // Mostrar credenciales
    console.log('\n' + '='.repeat(60));
    console.log('✅ USUARIO DE PRUEBA CREADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`📧 Email: ${TEST_EMAIL}`);
    console.log(`🔑 Contraseña: ${TEST_PASSWORD}`);
    console.log(`🏢 Tenant: ${tenantName}`);
    console.log(`👤 Rol: ${TEST_ROLE}`);
    console.log('='.repeat(60));
    console.log('\n💡 Comparte estas credenciales con el equipo de AppConnect');
    console.log('   para que puedan probar la aplicación móvil.\n');
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar script
createTestUser();

