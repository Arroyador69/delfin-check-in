#!/usr/bin/env node

/**
 * Script para verificar el estado de la base de datos
 */

const { Pool } = require('pg');

// Configuración de la base de datos (usar las mismas variables que en Vercel)
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://usuario:password@host/database'
});

async function checkDatabase() {
  console.log('🔍 VERIFICANDO BASE DE DATOS');
  console.log('============================');
  
  try {
    // Verificar conexión
    const client = await pool.connect();
    console.log('✅ Conexión a la base de datos exitosa');
    
    // Verificar tablas
    console.log('\n📋 Verificando tablas...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tenants', 'users', 'subscriptions')
      ORDER BY table_name;
    `);
    
    console.log('Tablas encontradas:', tablesResult.rows.map(r => r.table_name));
    
    // Verificar tenants
    console.log('\n🏢 Verificando tenants...');
    const tenantsResult = await client.query('SELECT id, name, email, created_at FROM tenants ORDER BY created_at DESC LIMIT 5;');
    console.log('Total de tenants:', tenantsResult.rows.length);
    tenantsResult.rows.forEach(tenant => {
      console.log(`- ${tenant.name} (${tenant.email}) - ${tenant.created_at}`);
    });
    
    // Verificar usuarios
    console.log('\n👥 Verificando usuarios...');
    const usersResult = await client.query('SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5;');
    console.log('Total de usuarios:', usersResult.rows.length);
    usersResult.rows.forEach(user => {
      console.log(`- ${user.email} - ${user.created_at}`);
    });
    
    // Verificar suscripciones
    console.log('\n💳 Verificando suscripciones...');
    const subsResult = await client.query('SELECT id, tenant_id, stripe_subscription_id, status, created_at FROM subscriptions ORDER BY created_at DESC LIMIT 5;');
    console.log('Total de suscripciones:', subsResult.rows.length);
    subsResult.rows.forEach(sub => {
      console.log(`- ${sub.stripe_subscription_id} (${sub.status}) - ${sub.created_at}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Asegúrate de que:');
    console.log('1. Las variables de entorno estén configuradas');
    console.log('2. La base de datos esté accesible');
    console.log('3. Las tablas estén creadas');
  } finally {
    await pool.end();
  }
}

checkDatabase();

