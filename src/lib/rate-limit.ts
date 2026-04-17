/**
 * 🛡️ SISTEMA DE RATE LIMITING
 * 
 * Protección contra ataques de fuerza bruta y abuse
 * Implementación in-memory con soporte para múltiples endpoints
 */

// ============================================
// TIPOS
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

interface RateLimitConfig {
  maxAttempts: number; // Máximo número de intentos
  windowMs: number; // Ventana de tiempo en milisegundos
  blockDurationMs: number; // Duración del bloqueo en milisegundos
}

// ============================================
// ALMACENAMIENTO IN-MEMORY
// ============================================

// Map para almacenar intentos por IP
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuraciones predefinidas
export const RATE_LIMIT_CONFIGS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
    blockDurationMs: 30 * 60 * 1000 // 30 minutos de bloqueo
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 5 * 60 * 1000 // 5 minutos de bloqueo
  },
  strict: {
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000, // 10 minutos
    blockDurationMs: 60 * 60 * 1000 // 1 hora de bloqueo
  },
  /** POST /api/public/form/[slug]/submit (form.delfincheckin.com → admin): por IP + tenant */
  publicFormSubmit: {
    maxAttempts: 25,
    windowMs: 15 * 60 * 1000, // 15 minutos
    blockDurationMs: 30 * 60 * 1000 // 30 min bloqueo
  }
} as const;

/**
 * Rutas que no deben contar en el rate limit global del middleware (webhooks de terceros,
 * cron, healthchecks). Sin esto Stripe/Telegram podrían recibir 429 o reintentos masivos.
 */
export function isGlobalApiRateLimitExempt(pathname: string): boolean {
  if (pathname.startsWith('/api/stripe/webhook')) return true;
  if (pathname.startsWith('/api/telegram/webhook')) return true;
  if (pathname.startsWith('/api/whatsapp/webhook')) return true;
  if (pathname.startsWith('/api/cron/')) return true;
  if (pathname === '/api/health' || pathname.startsWith('/api/health/')) return true;
  if (pathname === '/api/database/status' || pathname.startsWith('/api/database/status/')) return true;
  return false;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Limpia entradas expiradas del store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Si el bloqueo ha expirado y el reset time también, eliminar
    if (entry.blockedUntil && entry.blockedUntil < now && entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
    // Si no está bloqueado pero la ventana de reset ha pasado, eliminar
    else if (!entry.blockedUntil && entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Obtiene la IP del cliente desde los headers de la request
 * @param headers - Headers de la request
 * @returns IP del cliente
 */
export function getClientIP(headers: Headers): string {
  // Intentar obtener IP de diferentes headers
  const forwardedFor = headers.get('x-forwarded-for');
  const realIP = headers.get('x-real-ip');
  const cfConnectingIP = headers.get('cf-connecting-ip'); // Cloudflare
  
  if (forwardedFor) {
    // x-forwarded-for puede contener múltiples IPs, tomar la primera
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback a una IP genérica si no se puede determinar
  return 'unknown';
}

/**
 * Verifica si una IP está bloqueada por rate limiting
 * @param identifier - Identificador único (normalmente IP)
 * @param config - Configuración de rate limiting
 * @returns Objeto con estado de rate limit
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.login
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blockedUntil?: number;
  retryAfter?: number;
} {
  cleanupExpiredEntries();
  
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Si no existe entrada, crear una nueva
  if (!entry) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs
    });

    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetTime: now + config.windowMs
    };
  }

  // Verificar si está bloqueado
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      blockedUntil: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) // en segundos
    };
  }

  // Si el bloqueo ha expirado, limpiar
  if (entry.blockedUntil && entry.blockedUntil <= now) {
    rateLimitStore.delete(identifier);
    return checkRateLimit(identifier, config);
  }

  // Si la ventana de tiempo ha pasado, resetear contador
  if (entry.resetTime <= now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs
    });

    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetTime: now + config.windowMs
    };
  }

  // Incrementar contador
  entry.count++;

  // Si se excedió el límite, bloquear
  if (entry.count > config.maxAttempts) {
    entry.blockedUntil = now + config.blockDurationMs;
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      blockedUntil: entry.blockedUntil,
      retryAfter: Math.ceil(config.blockDurationMs / 1000)
    };
  }

  // Aún dentro del límite
  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * Registra un intento fallido
 * @param identifier - Identificador único (normalmente IP)
 * @param config - Configuración de rate limiting
 * @returns Estado actualizado del rate limit
 */
export function recordFailedAttempt(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.login
) {
  return checkRateLimit(identifier, config);
}

/**
 * Limpia los intentos de un identificador (usar tras login exitoso)
 * @param identifier - Identificador a limpiar
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Limpia todos los rate limits (usar con precaución)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Obtiene el estado actual de rate limit sin incrementar
 * @param identifier - Identificador a consultar
 * @returns Estado del rate limit o null si no existe
 */
export function getRateLimitStatus(identifier: string): RateLimitEntry | null {
  return rateLimitStore.get(identifier) || null;
}

/**
 * Middleware helper para Next.js API routes
 * @param identifier - IP u otro identificador
 * @param config - Configuración de rate limiting
 * @returns Response de error si está bloqueado, null si está permitido
 */
export function rateLimitMiddleware(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.login
): Response | null {
  const result = checkRateLimit(identifier, config);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Demasiados intentos',
        message: `Has excedido el límite de intentos. Por favor, intenta de nuevo en ${result.retryAfter} segundos.`,
        retryAfter: result.retryAfter,
        blockedUntil: result.blockedUntil
      }),
      {
        status: 429, // Too Many Requests
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter || 60),
          'X-RateLimit-Limit': String(config.maxAttempts),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetTime)
        }
      }
    );
  }

  return null;
}

// ============================================
// LIMPIEZA AUTOMÁTICA
// ============================================

// Ejecutar limpieza cada 5 minutos
if (typeof window === 'undefined') { // Solo en servidor
  setInterval(() => {
    cleanupExpiredEntries();
  }, 5 * 60 * 1000);
}

// ============================================
// UTILIDADES DE LOGGING
// ============================================

/**
 * Obtiene estadísticas del rate limiting
 */
export function getRateLimitStats() {
  return {
    totalEntries: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([key, value]) => ({
      identifier: key,
      ...value
    }))
  };
}

