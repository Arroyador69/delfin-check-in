import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 🔍 API PARA VERIFICAR TENANTS Y USUARIOS EXISTENTES
 * 
 * Esta API permite ver qué tenants y usuarios están en la base de datos
 */

export async function GET() {
  try {
    // Obtener todos los tenants
    const tenantsResult = await sql.query(`
      SELECT 
        t.id,
        t.name,
        t.email,
        t.plan_id,
        t.status,
        t.max_rooms,
        t.current_rooms,
        t.created_at,
        t.updated_at
      FROM tenants t
      ORDER BY t.created_at DESC
    `);

    // Obtener todos los usuarios con información del tenant
    const usersResult = await sql.query(`
      SELECT 
        tu.id as user_id,
        tu.email as user_email,
        tu.full_name,
        tu.role,
        tu.is_active,
        tu.email_verified,
        tu.last_login,
        tu.created_at as user_created_at,
        t.id as tenant_id,
        t.name as tenant_name,
        t.email as tenant_email,
        t.status as tenant_status
      FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      ORDER BY tu.created_at DESC
    `);

    // Buscar específicamente el email contacto@delfincheckin.com
    const specificTenantResult = await sql.query(
      'SELECT * FROM tenants WHERE email = $1',
      ['contacto@delfincheckin.com']
    );

    const specificUserResult = await sql.query(
      'SELECT * FROM tenant_users WHERE email = $1',
      ['contacto@delfincheckin.com']
    );

    return NextResponse.json({
      success: true,
      tenants: tenantsResult.rows,
      users: usersResult.rows,
      specificTenant: specificTenantResult.rows,
      specificUser: specificUserResult.rows,
      summary: {
        totalTenants: tenantsResult.rows.length,
        totalUsers: usersResult.rows.length,
        hasSpecificTenant: specificTenantResult.rows.length > 0,
        hasSpecificUser: specificUserResult.rows.length > 0
      }
    });

  } catch (error) {
    console.error('❌ Error verificando tenants:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Crear un usuario para un tenant existente
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantEmail, userEmail, password, userFullName, role = 'owner' } = await req.json();
    
    if (!tenantEmail || !userEmail || !password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: tenantEmail, userEmail, password' },
        { status: 400 }
      );
    }

    // Buscar el tenant
    const tenantResult = await sql.query(
      'SELECT id, name, status FROM tenants WHERE email = $1',
      [tenantEmail.toLowerCase()]
    );

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró el tenant con ese email' },
        { status: 404 }
      );
    }

    const tenant = tenantResult.rows[0];

    // Verificar si ya existe un usuario con ese email
    const existingUser = await sql.query(
      'SELECT id FROM tenant_users WHERE email = $1',
      [userEmail.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 409 }
      );
    }

    // Importar hashPassword dinámicamente
    const { hashPassword } = await import('@/lib/auth');
    const passwordHash = await hashPassword(password);

    // Crear el usuario
    const userResult = await sql.query(`
      INSERT INTO tenant_users (
        tenant_id,
        email,
        password_hash,
        full_name,
        role,
        is_active,
        email_verified
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      ) RETURNING id, email, full_name, role, is_active
    `, [
      tenant.id,
      userEmail.toLowerCase(),
      passwordHash,
      userFullName || 'Usuario',
      role,
      true,
      true
    ]);

    const user = userResult.rows[0];

    console.log(`✅ Usuario creado para tenant ${tenant.name}: ${user.full_name} (${user.email})`);

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenantEmail,
        status: tenant.status
      }
    });

  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
