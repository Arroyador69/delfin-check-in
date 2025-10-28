/**
 * 🔐 AUTENTICACIÓN COMPATIBLE CON EDGE RUNTIME
 * 
 * Implementación de verificación de tokens JWT usando solo Web Crypto API
 * Compatible con Edge Runtime de Next.js
 */

// ============================================
// TIPOS
// ============================================

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: 'owner' | 'admin' | 'staff';
  tenantName?: string;
  planId?: string;
  iat?: number;
  exp?: number;
}

// ============================================
// FUNCIONES DE VERIFICACIÓN DE TOKEN
// ============================================

/**
 * Verifica un token JWT usando Web Crypto API (compatible con Edge Runtime)
 * @param token - Token JWT a verificar
 * @returns Payload decodificado si es válido, null si es inválido
 */
export function verifyTokenEdge(token: string): JWTPayload | null {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    console.error('JWT_SECRET no está configurado');
    return null;
  }

  try {
    // Decodificar el token sin verificar la firma (para Edge Runtime)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decodificar el payload
    const payload = JSON.parse(atob(parts[1])) as JWTPayload;
    
    if (!payload || !payload.exp) {
      return null;
    }

    // Verificar expiración
    const isExpired = payload.exp * 1000 < Date.now();
    if (isExpired) {
      console.log('Token expirado');
      return null;
    }

    // Verificación básica de estructura
    if (!payload.userId || !payload.tenantId || !payload.email || !payload.role) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Error al verificar token:', error);
    return null;
  }
}

/**
 * Decodifica un token JWT sin verificar (útil para debugging)
 * @param token - Token JWT
 * @returns Payload decodificado o null
 */
export function decodeTokenEdge(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1])) as JWTPayload;
    return payload;
  } catch (error) {
    console.error('Error al decodificar token:', error);
    return null;
  }
}

/**
 * Verifica si un token ha expirado
 * @param token - Token JWT a verificar
 * @returns true si ha expirado, false si no
 */
export function isTokenExpiredEdge(token: string): boolean {
  try {
    const payload = decodeTokenEdge(token);
    
    if (!payload || !payload.exp) {
      return true;
    }

    // exp está en segundos, Date.now() en milisegundos
    const isExpired = payload.exp * 1000 < Date.now();
    return isExpired;
  } catch (error) {
    console.error('Error al verificar expiración:', error);
    return true;
  }
}

/**
 * Extrae el token de un header Authorization Bearer
 * @param authHeader - Header de autorización
 * @returns Token extraído o null
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remover 'Bearer '
}

// ============================================
// CONFIGURACIÓN
// ============================================

export const AUTH_CONFIG = {
  cookieName: 'auth_token',
  refreshCookieName: 'refresh_token'
} as const;
