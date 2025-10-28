import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateTokenPair, AUTH_CONFIG } from '@/lib/auth';
import { sql } from '@/lib/db';

/**
 * 🧪 API PARA PROBAR LOGIN
 * 
 * Este endpoint permite probar el login sin rate limiting
 * para diagnosticar problemas de autenticación.
 */

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña requeridos' },
        { status: 400 }
      );
    }

    console.log('🧪 Probando login para:', email);

    // Buscar tenant por email
    const tenantResult = await sql`
      SELECT id, name, email, status, plan_id, max_rooms, current_rooms
      FROM tenants 
      WHERE email = ${email.toLowerCase()} 
        AND status IN ('active', 'trial')
    `;

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const tenant = tenantResult.rows[0];
    console.log('✅ Tenant encontrado:', tenant.name);

    // Buscar usuario
    const userResult = await sql`
      SELECT id, email, full_name, role, password_hash, is_active
      FROM tenant_users 
      WHERE email = ${email.toLowerCase()} 
        AND tenant_id = ${tenant.id}
        AND is_active = true
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    console.log('✅ Usuario encontrado:', user.email);

    // Verificar contraseña
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    console.log('✅ Contraseña válida');

    // Generar tokens
    const tokenPayload = {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
      tenantName: tenant.name,
      planId: tenant.plan_id
    };

    const { accessToken, refreshToken } = generateTokenPair(tokenPayload);
    console.log('✅ Tokens generados');

    // Crear respuesta
    const response = NextResponse.json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status
        }
      }
    });

    // Establecer cookies
    const isProduction = process.env.NODE_ENV === 'production';
    
    response.cookies.set(AUTH_CONFIG.cookieName, accessToken, {
      httpOnly: true,
      secure: false, // Temporalmente en false para debug
      sameSite: 'lax', // Cambiar a 'lax' para mejor compatibilidad
      maxAge: 60 * 60 * 2, // 2 horas
      path: '/',
    });

    response.cookies.set(AUTH_CONFIG.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: false, // Temporalmente en false para debug
      sameSite: 'lax', // Cambiar a 'lax' para mejor compatibilidad
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/api/auth',
    });

    console.log('✅ Cookies establecidas');

    return response;

  } catch (error) {
    console.error('❌ Error en test-login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
