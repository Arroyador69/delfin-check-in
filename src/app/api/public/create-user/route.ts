import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * 👤 API PÚBLICA PARA CREAR USUARIOS
 * 
 * Esta API nos ayuda a crear usuarios para tenants existentes
 */

export async function POST(req: NextRequest) {
  try {
    const { tenantEmail, userEmail, userFullName, password, role = 'owner' } = await req.json();
    
    console.log(`👤 CREATE USER - Tenant email: ${tenantEmail}`);
    console.log(`👤 CREATE USER - User email: ${userEmail}`);
    console.log(`👤 CREATE USER - Password: ${password ? '[PROVIDED]' : '[MISSING]'}`);
    
    if (!tenantEmail || !userEmail || !password) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos: tenantEmail, userEmail, password'
      }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres'
      }, { status: 400 });
    }

    // 1. Buscar el tenant
    const tenantQuery = `
      SELECT id, name, email, status, plan_id
      FROM tenants 
      WHERE email = $1
      LIMIT 1
    `;
    
    const tenantResult = await sql.query(tenantQuery, [tenantEmail.toLowerCase()]);
    
    console.log(`👤 CREATE USER - Tenants encontrados: ${tenantResult.rows.length}`);
    
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontró el tenant con ese email',
        debug: {
          searchedTenantEmail: tenantEmail.toLowerCase()
        }
      }, { status: 404 });
    }

    const tenant = tenantResult.rows[0];
    
    console.log(`👤 CREATE USER - Tenant encontrado: ${tenant.name} (${tenant.email})`);

    // 2. Verificar si ya existe un usuario con ese email
    const existingUserQuery = await sql.query(
      'SELECT id FROM tenant_users WHERE email = $1',
      [userEmail.toLowerCase()]
    );

    if (existingUserQuery.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Ya existe un usuario con ese email',
        debug: {
          existingUserEmail: userEmail.toLowerCase()
        }
      }, { status: 409 });
    }

    // 3. Hashear la contraseña
    console.log(`👤 CREATE USER - Hasheando contraseña...`);
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    
    console.log(`👤 CREATE USER - Contraseña hasheada exitosamente`);

    // 4. Crear el usuario
    const createUserQuery = `
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
      ) RETURNING id, email, full_name, role, is_active, created_at
    `;
    
    const createUserResult = await sql.query(createUserQuery, [
      tenant.id,
      userEmail.toLowerCase(),
      passwordHash,
      userFullName || 'Usuario',
      role,
      true,
      true
    ]);

    if (createUserResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Error al crear el usuario en la base de datos'
      }, { status: 500 });
    }

    const newUser = createUserResult.rows[0];
    
    console.log(`✅ CREATE USER - Usuario creado exitosamente: ${newUser.email}`);

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        isActive: newUser.is_active,
        createdAt: newUser.created_at
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        status: tenant.status,
        planId: tenant.plan_id
      },
      debug: {
        steps: [
          'Tenant encontrado',
          'Usuario no existía',
          'Contraseña hasheada',
          'Usuario creado en BD'
        ]
      }
    });

  } catch (error) {
    console.error('❌ CREATE USER - Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
