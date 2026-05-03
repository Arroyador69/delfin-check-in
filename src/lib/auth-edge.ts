/**
 * 🔐 AUTENTICACIÓN COMPATIBLE CON EDGE RUNTIME
 *
 * Verificación de JWT con firma HS256 (jose) — no solo decodificación Base64.
 */

import { jwtVerify } from 'jose';

// ============================================
// TIPOS
// ============================================

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: 'owner' | 'admin' | 'staff';
  isPlatformAdmin?: boolean;
  tenantName?: string;
  planId?: string;
  iat?: number;
  exp?: number;
}

function isRole(r: unknown): r is JWTPayload['role'] {
  return r === 'owner' || r === 'admin' || r === 'staff';
}

/**
 * Verifica firma y expiración del JWT (HS256, mismo secreto que jsonwebtoken en Node).
 */
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('JWT_SECRET no está configurado');
    return null;
  }

  try {
    const secretKey = new TextEncoder().encode(jwtSecret);
    const { payload: raw } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    // Coerción a string: jsonwebtoken (Node) y drivers PG pueden serializar UUIDs de forma distinta a jose (Edge).
    const userIdRaw = raw.userId;
    const tenantIdRaw = raw.tenantId;
    const emailRaw = raw.email;
    const userId =
      typeof userIdRaw === 'string'
        ? userIdRaw.trim() || null
        : userIdRaw != null && String(userIdRaw).trim() !== ''
          ? String(userIdRaw).trim()
          : null;
    const tenantId =
      typeof tenantIdRaw === 'string'
        ? tenantIdRaw.trim() || null
        : tenantIdRaw != null && String(tenantIdRaw).trim() !== ''
          ? String(tenantIdRaw).trim()
          : null;
    const email =
      typeof emailRaw === 'string'
        ? emailRaw.trim() || null
        : emailRaw != null && String(emailRaw).includes('@')
          ? String(emailRaw).trim()
          : null;
    const role = raw.role;

    if (!userId || !tenantId || !email || !isRole(role)) {
      return null;
    }

    const out: JWTPayload = {
      userId,
      tenantId,
      email,
      role,
      isPlatformAdmin: raw.isPlatformAdmin === true,
      tenantName: typeof raw.tenantName === 'string' ? raw.tenantName : undefined,
      planId: typeof raw.planId === 'string' ? raw.planId : undefined,
      iat: typeof raw.iat === 'number' ? raw.iat : undefined,
      exp: typeof raw.exp === 'number' ? raw.exp : undefined,
    };

    return out;
  } catch (error) {
    console.error('Error al verificar token (Edge):', error);
    return null;
  }
}

/**
 * Decodifica un token JWT sin verificar (solo diagnóstico / hints de UI; no usar para autorización)
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
 * Verifica si un token ha expirado (sin verificar firma)
 */
export function isTokenExpiredEdge(token: string): boolean {
  try {
    const payload = decodeTokenEdge(token);

    if (!payload || !payload.exp) {
      return true;
    }

    const isExpired = payload.exp * 1000 < Date.now();
    return isExpired;
  } catch (error) {
    console.error('Error al verificar expiración:', error);
    return true;
  }
}

/**
 * Extrae el token de un header Authorization Bearer
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

export const AUTH_CONFIG = {
  cookieName: 'auth_token',
  refreshCookieName: 'refresh_token',
} as const;
