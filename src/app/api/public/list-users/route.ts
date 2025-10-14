import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 📋 API PÚBLICA PARA LISTAR USUARIOS
 * 
 * Esta API nos ayuda a ver qué usuarios existen en la base de datos
 */

export async function GET() {
  try {
    console.log(`📋 LIST USERS - Iniciando búsqueda de usuarios...`);

    // 1. Listar todos los usuarios con información del tenant
    const usersQuery = `
      SELECT 
        tu.id as user_id,
        tu.email,
        tu.full_name,
        tu.role,
        tu.is_active,
        tu.email_verified,
        tu.created_at as user_created_at,
        tu.last_login,
        t.id as tenant_id,
        t.name as tenant_name,
        t.email as tenant_email,
        t.status as tenant_status,
        t.plan_id,
        t.max_rooms,
        t.current_rooms
      FROM tenant_users tu
      LEFT JOIN tenants t ON tu.tenant_id = t.id
      ORDER BY tu.created_at DESC
    `;
    
    const usersResult = await sql.query(usersQuery);
    
    console.log(`📋 LIST USERS - Usuarios encontrados: ${usersResult.rows.length}`);

    // 2. Listar todos los tenants
    const tenantsQuery = `
      SELECT 
        id,
        name,
        email,
        plan_id,
        status,
        max_rooms,
        current_rooms,
        created_at
      FROM tenants
      ORDER BY created_at DESC
    `;
    
    const tenantsResult = await sql.query(tenantsQuery);
    
    console.log(`📋 LIST USERS - Tenants encontrados: ${tenantsResult.rows.length}`);

    // 3. Buscar específicamente el email contacto@delfincheckin.com en ambas tablas
    const specificUserQuery = await sql.query(
      'SELECT * FROM tenant_users WHERE email = $1',
      ['contacto@delfincheckin.com']
    );
    
    const specificTenantQuery = await sql.query(
      'SELECT * FROM tenants WHERE email = $1',
      ['contacto@delfincheckin.com']
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalUsers: usersResult.rows.length,
        totalTenants: tenantsResult.rows.length,
        hasSpecificUser: specificUserQuery.rows.length > 0,
        hasSpecificTenant: specificTenantQuery.rows.length > 0
      },
      users: usersResult.rows,
      tenants: tenantsResult.rows,
      specificUser: specificUserQuery.rows,
      specificTenant: specificTenantQuery.rows
    });

  } catch (error) {
    console.error('❌ LIST USERS - Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
