import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateTokenPair, AUTH_CONFIG } from '@/lib/auth';
import { getClientIP, rateLimitMiddleware, recordFailedAttempt, clearRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { sql } from '@/lib/db';
export const runtime = 'nodejs';

/**
 * 🔐 API DE LOGIN MULTI-TENANT
 * 
 * Características:
 * - Autenticación por email y contraseña por tenant
 * - Verificación con bcrypt contra tabla tenant_users
 * - Generación de JWT tokens con tenant_id y user_id
 * - Rate limiting (5 intentos/15min)
 * - HttpOnly cookies
 * - Logging de intentos
 */

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { email, password } = await req.json();
    
    // Validar que se proporcionaron email y contraseña
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { 
          error: 'Email requerido',
          message: 'Debes proporcionar un email válido'
        },
        { status: 400 }
      );
    }
    
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { 
          error: 'Contraseña requerida',
          message: 'Debes proporcionar una contraseña válida'
        },
        { status: 400 }
      );
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'Email inválido',
          message: 'El formato del email no es válido'
        },
        { status: 400 }
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 1: VERIFICAR RATE LIMITING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const clientIP = getClientIP(req.headers);
    
    // Verificar si el cliente está bloqueado por rate limiting
    const rateLimitResponse = rateLimitMiddleware(clientIP, RATE_LIMIT_CONFIGS.login);
    
    if (rateLimitResponse) {
      console.warn(`🛡️ Rate limit exceeded for IP: ${clientIP}`);
      return rateLimitResponse;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 2: VERIFICAR CONFIGURACIÓN DEL SERVIDOR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('❌ Variable de entorno no configurada: JWT_SECRET');
      
      return NextResponse.json(
        { 
          error: 'Error de configuración del servidor',
          message: 'El servidor no está configurado correctamente. Contacta al administrador.'
        },
        { status: 500 }
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 3: BUSCAR TENANT POR EMAIL Y LUEGO USUARIO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    console.log(`🔍 Búsqueda de tenant para email: ${email.toLowerCase()}`);
    
    // Primero buscar el tenant por email
    const tenantQuery = `
      SELECT 
        id,
        name,
        email,
        status,
        plan_id,
        max_rooms,
        current_rooms
      FROM tenants 
      WHERE email = $1
      LIMIT 1
    `;
    
    const tenantResult = await sql.query(tenantQuery, [email.toLowerCase()]);
    
    console.log(`🔍 Tenants encontrados: ${tenantResult.rows.length}`);
    
    if (tenantResult.rows.length === 0) {
      // Registrar intento fallido
      const rateLimitStatus = recordFailedAttempt(clientIP, RATE_LIMIT_CONFIGS.login);
      
      console.warn(`⚠️ Tenant no encontrado: ${email} desde IP: ${clientIP} (${rateLimitStatus.remaining} intentos restantes)`);
      
      return NextResponse.json(
        { 
          error: 'Credenciales inválidas',
          message: 'Email o contraseña incorrectos',
          remaining: rateLimitStatus.remaining
        },
        { status: 401 }
      );
    }
    
    const tenant = tenantResult.rows[0];
    
    console.log(`🔍 Tenant encontrado: ${tenant.name} (${tenant.email}) - Estado: ${tenant.status}`);
    
    // Ahora buscar el usuario que pertenece a este tenant
    const userQuery = `
      SELECT 
        tu.id,
        tu.email,
        tu.password_hash,
        tu.full_name,
        tu.role,
        tu.is_active,
        tu.email_verified,
        tu.last_login
      FROM tenant_users tu
      WHERE tu.tenant_id = $1 AND tu.is_active = true
      LIMIT 1
    `;
    
    const userResult = await sql.query(userQuery, [tenant.id]);
    
    console.log(`🔍 Usuarios encontrados para tenant: ${userResult.rows.length}`);
    
    if (userResult.rows.length === 0) {
      // Registrar intento fallido
      const rateLimitStatus = recordFailedAttempt(clientIP, RATE_LIMIT_CONFIGS.login);
      
      console.warn(`⚠️ Usuario no encontrado para tenant ${tenant.name} desde IP: ${clientIP} (${rateLimitStatus.remaining} intentos restantes)`);
      
      return NextResponse.json(
        { 
          error: 'Credenciales inválidas',
          message: 'Email o contraseña incorrectos',
          remaining: rateLimitStatus.remaining
        },
        { status: 401 }
      );
    }
    
    const user = userResult.rows[0];
    
    // Verificar que el tenant esté activo
    if (tenant.status !== 'active' && tenant.status !== 'trial') {
      console.warn(`⚠️ Tenant inactivo: ${tenant.name} (${tenant.status}) para email: ${email}`);
      
      return NextResponse.json(
        { 
          error: 'Cuenta suspendida',
          message: 'Tu cuenta ha sido suspendida. Contacta al administrador.'
        },
        { status: 403 }
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 4: VERIFICAR CONTRASEÑA CON BCRYPT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    console.log(`🔍 Verificando contraseña para usuario: ${user.email}`);
    console.log(`🔍 Tenant: ${tenant.name} (${tenant.status})`);
    console.log(`🔍 Usuario activo: ${user.is_active}`);
    
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    
    console.log(`🔍 Resultado verificación contraseña: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      // Registrar intento fallido
      const rateLimitStatus = recordFailedAttempt(clientIP, RATE_LIMIT_CONFIGS.login);
      
      console.warn(`⚠️ Contraseña incorrecta para ${email} desde IP: ${clientIP} (${rateLimitStatus.remaining} intentos restantes)`);
      
      return NextResponse.json(
        { 
          error: 'Credenciales inválidas',
          message: 'Email o contraseña incorrectos',
          remaining: rateLimitStatus.remaining
        },
        { status: 401 }
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 5: ACTUALIZAR ÚLTIMO LOGIN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    await sql.query(
      'UPDATE tenant_users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 6: GENERAR TOKENS JWT MULTI-TENANT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const tokenPayload = {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
      tenantName: tenant.name,
      planId: tenant.plan_id
    };
    
    const { accessToken, refreshToken } = generateTokenPair(tokenPayload);
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 5: ESTABLECER COOKIES SEGURAS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    const response = NextResponse.json({ 
      success: true,
      message: 'Autenticación exitosa',
      expiresIn: '2h', // Información para el cliente
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          planId: tenant.plan_id,
          maxRooms: tenant.max_rooms,
          currentRooms: tenant.current_rooms
        }
      }
    });
    
    // Cookie de access token (2 horas)
    response.cookies.set(AUTH_CONFIG.cookieName, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 2, // 2 horas en segundos
      path: '/',
    });
    
    // Cookie de refresh token (7 días)
    response.cookies.set(AUTH_CONFIG.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 días en segundos
      path: '/api/auth', // Solo accesible en rutas de auth
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 6: LIMPIAR RATE LIMIT Y LOGGING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // Limpiar rate limit tras login exitoso
    clearRateLimit(clientIP);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Login exitoso: ${user.email} (${tenant.name}) desde IP: ${clientIP} (${duration}ms)`);
    
    return response;
    
  } catch (error) {
    console.error('❌ Error en login:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: 'Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.'
      },
      { status: 500 }
    );
  }
}

/**
 * Manejo de método no permitido
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  );
}
