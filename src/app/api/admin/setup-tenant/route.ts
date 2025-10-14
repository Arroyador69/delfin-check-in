import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/**
 * 🔧 API PARA CONFIGURAR TENANT INICIAL
 * 
 * Esta API crea el tenant por defecto y usuario administrador
 * Solo debe usarse una vez para la configuración inicial
 */

export async function POST(req: NextRequest) {
  try {
    const { tenantName, tenantEmail, userEmail, password, userFullName } = await req.json();
    
    // Validaciones
    if (!tenantName || !tenantEmail || !userEmail || !password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Validar formato de emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tenantEmail) || !emailRegex.test(userEmail)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un tenant
    const existingTenant = await sql.query(
      'SELECT id FROM tenants WHERE email = $1',
      [tenantEmail.toLowerCase()]
    );

    if (existingTenant.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un tenant con este email' },
        { status: 409 }
      );
    }

    // Verificar si ya existe un usuario
    const existingUser = await sql.query(
      'SELECT id FROM tenant_users WHERE email = $1',
      [userEmail.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' },
        { status: 409 }
      );
    }

    // Hashear la contraseña
    const passwordHash = await hashPassword(password);

    // Crear el tenant
    const tenantResult = await sql.query(`
      INSERT INTO tenants (
        name, 
        email, 
        plan_id, 
        max_rooms, 
        current_rooms, 
        status,
        config
      ) VALUES (
        $1, 
        $2, 
        $3, 
        $4, 
        $5, 
        $6,
        $7
      ) RETURNING id, name, email, plan_id, status
    `, [
      tenantName,
      tenantEmail.toLowerCase(),
      'premium', // Plan inicial
      10, // Máximo de habitaciones
      0, // Habitaciones actuales
      'active', // Estado activo
      JSON.stringify({
        propertyName: tenantName,
        timezone: "Europe/Madrid",
        language: "es",
        currency: "EUR",
        mir: {
          enabled: true,
          codigoEstablecimiento: "",
          denominacion: tenantName,
          direccionCompleta: "",
          autoSubmit: false,
          testMode: true
        }
      })
    ]);

    const tenant = tenantResult.rows[0];

    // Crear el usuario administrador
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
      ) RETURNING id, email, full_name, role
    `, [
      tenant.id,
      userEmail.toLowerCase(),
      passwordHash,
      userFullName || 'Administrador',
      'owner',
      true,
      true
    ]);

    const user = userResult.rows[0];

    console.log(`✅ Tenant creado: ${tenant.name} (${tenant.email})`);
    console.log(`✅ Usuario creado: ${user.full_name} (${user.email})`);

    return NextResponse.json({
      success: true,
      message: 'Tenant y usuario creados exitosamente',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        planId: tenant.plan_id,
        status: tenant.status
      },
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Error creando tenant:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: 'No se pudo crear el tenant. Intenta de nuevo.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Obtener información de tenants existentes
 */
export async function GET() {
  try {
    const result = await sql.query(`
      SELECT 
        t.id,
        t.name,
        t.email,
        t.plan_id,
        t.status,
        t.max_rooms,
        t.current_rooms,
        t.created_at,
        COUNT(tu.id) as user_count
      FROM tenants t
      LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
      GROUP BY t.id, t.name, t.email, t.plan_id, t.status, t.max_rooms, t.current_rooms, t.created_at
      ORDER BY t.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      tenants: result.rows
    });

  } catch (error) {
    console.error('❌ Error obteniendo tenants:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
