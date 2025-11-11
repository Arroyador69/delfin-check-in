// =====================================================
// API ENDPOINT: LOGIN MÓVIL (React Native)
// =====================================================
// Este endpoint es idéntico a /api/admin/login pero devuelve
// tokens en JSON body en lugar de cookies para apps móviles

import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateTokenPair, AUTH_CONFIG } from '@/lib/auth';
import { getClientIP, rateLimitMiddleware, recordFailedAttempt, clearRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { email, password } = await req.json();
    
    // Validaciones básicas
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400 }
      );
    }
    
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Contraseña requerida' },
        { status: 400 }
      );
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Rate limiting
    const clientIP = getClientIP(req.headers);
    const rateLimitResponse = rateLimitMiddleware(clientIP, RATE_LIMIT_CONFIGS.login);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Verificar JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      );
    }

    // Buscar tenant por email
    const tenantQuery = `
      SELECT 
        id, name, email, plan_id, status, max_rooms, current_rooms
      FROM tenants
      WHERE email = $1
      LIMIT 1
    `;
    
    const tenantResult = await sql.query(tenantQuery, [email.toLowerCase()]);
    
    if (tenantResult.rows.length === 0) {
      recordFailedAttempt(clientIP, RATE_LIMIT_CONFIGS.login);
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }
    
    const tenant = tenantResult.rows[0];

    // Buscar usuario en ese tenant
    const userQuery = `
      SELECT 
        id, email, password_hash, full_name, role, is_platform_admin
      FROM tenant_users
      WHERE tenant_id = $1 AND email = $2 AND is_active = true
      LIMIT 1
    `;
    
    const userResult = await sql.query(userQuery, [tenant.id, email.toLowerCase()]);
    
    if (userResult.rows.length === 0) {
      recordFailedAttempt(clientIP, RATE_LIMIT_CONFIGS.login);
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }
    
    const user = userResult.rows[0];

    // Verificar contraseña
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      recordFailedAttempt(clientIP, RATE_LIMIT_CONFIGS.login);
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Actualizar último login
    await sql.query(
      'UPDATE tenant_users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generar tokens JWT
    const tokenPayload = {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
      isPlatformAdmin: user.is_platform_admin || false,
      tenantName: tenant.name,
      planId: tenant.plan_id
    };
    
    const { accessToken, refreshToken } = generateTokenPair(tokenPayload);

    // Limpiar rate limit
    clearRateLimit(clientIP);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Login móvil exitoso: ${user.email} (${tenant.name}) desde IP: ${clientIP} (${duration}ms)`);

    // Devolver tokens en JSON body (NO cookies)
    return NextResponse.json({ 
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 7200, // 2 horas en segundos
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isPlatformAdmin: user.is_platform_admin || false,
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
    
  } catch (error) {
    console.error('❌ Error en login móvil:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

