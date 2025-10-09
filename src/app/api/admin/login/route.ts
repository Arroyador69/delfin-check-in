import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateTokenPair, AUTH_CONFIG } from '@/lib/auth';
import { getClientIP, rateLimitMiddleware, recordFailedAttempt, clearRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

/**
 * 🔐 API DE LOGIN SEGURA
 * 
 * Características:
 * - Verificación con bcrypt
 * - Generación de JWT tokens
 * - Rate limiting (5 intentos/15min)
 * - HttpOnly cookies
 * - Logging de intentos
 */

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { password } = await req.json();
    
    // Validar que se proporcionó una contraseña
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { 
          error: 'Contraseña requerida',
          message: 'Debes proporcionar una contraseña válida'
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
    
    // Obtener hash bcrypt de la contraseña y secreto JWT
    const adminSecretHashBase64 = process.env.ADMIN_SECRET_HASH_BASE64;
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!adminSecretHashBase64 || !jwtSecret) {
      console.error('❌ Variables de entorno no configuradas:');
      console.error('  - ADMIN_SECRET_HASH_BASE64:', adminSecretHashBase64 ? '✓' : '✗');
      console.error('  - JWT_SECRET:', jwtSecret ? '✓' : '✗');
      
      return NextResponse.json(
        { 
          error: 'Error de configuración del servidor',
          message: 'El servidor no está configurado correctamente. Contacta al administrador.'
        },
        { status: 500 }
      );
    }

    // Decodificar el hash desde base64
    let adminSecretHash: string;
    try {
      adminSecretHash = Buffer.from(adminSecretHashBase64, 'base64').toString('utf-8');
    } catch (error) {
      console.error('❌ Error decodificando hash base64:', error);
      return NextResponse.json(
        { 
          error: 'Error de configuración del servidor',
          message: 'El servidor no está configurado correctamente. Contacta al administrador.'
        },
        { status: 500 }
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 3: VERIFICAR CONTRASEÑA CON BCRYPT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const isPasswordValid = await verifyPassword(password, adminSecretHash);
    
    
    if (!isPasswordValid) {
      // Registrar intento fallido
      const rateLimitStatus = recordFailedAttempt(clientIP, RATE_LIMIT_CONFIGS.login);
      
      console.warn(`⚠️ Login fallido desde IP: ${clientIP} (${rateLimitStatus.remaining} intentos restantes)`);
      
      return NextResponse.json(
        { 
          error: 'Credenciales inválidas',
          message: 'La contraseña es incorrecta',
          remaining: rateLimitStatus.remaining
        },
        { status: 401 }
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 4: GENERAR TOKENS JWT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const { accessToken, refreshToken } = generateTokenPair('admin');
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PASO 5: ESTABLECER COOKIES SEGURAS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    const response = NextResponse.json({ 
      success: true,
      message: 'Autenticación exitosa',
      expiresIn: '2h' // Información para el cliente
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
    console.log(`✅ Login exitoso desde IP: ${clientIP} (${duration}ms)`);
    
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
