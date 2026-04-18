/**
 * 🔐 UTILIDADES DE AUTENTICACIÓN SEGURA
 * 
 * Sistema de autenticación con:
 * - Bcrypt para hashear contraseñas
 * - JWT para tokens firmados criptográficamente
 * - Validación de tokens
 * - Gestión de sesiones seguras
 */

import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

// ============================================
// CONFIGURACIÓN
// ============================================

const BCRYPT_ROUNDS = 12; // Número de rondas de salt (más = más seguro pero más lento)
const JWT_EXPIRATION = '2h'; // Tokens expiran en 2 horas
const REFRESH_TOKEN_EXPIRATION = '7d'; // Refresh tokens expiran en 7 días

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

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ============================================
// FUNCIONES DE HASHING DE CONTRASEÑAS
// ============================================

/**
 * Hashea una contraseña usando bcrypt
 * @param password - Contraseña en texto plano
 * @returns Hash bcrypt de la contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('Error al hashear contraseña:', error);
    throw new Error('Error al procesar la contraseña');
  }
}

/**
 * Compara una contraseña en texto plano con un hash bcrypt
 * @param password - Contraseña en texto plano
 * @param hash - Hash bcrypt almacenado
 * @returns true si coinciden, false si no
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    console.error('❌ Error al verificar contraseña:', error);
    return false;
  }
}

// ============================================
// FUNCIONES DE JWT
// ============================================

/**
 * Genera un token JWT firmado
 * @param payload - Datos a incluir en el token
 * @param expiresIn - Tiempo de expiración (default: 2h)
 * @returns Token JWT firmado
 */
export function generateAccessToken(payload: JWTPayload, expiresIn: string = JWT_EXPIRATION): string {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno');
  }

  try {
    const signOptions: SignOptions = {
      expiresIn,
      algorithm: 'HS256',
    };
    const token = jwt.sign(payload, jwtSecret as Secret, signOptions);
    
    return token;
  } catch (error) {
    console.error('Error al generar token JWT:', error);
    throw new Error('Error al generar token de autenticación');
  }
}

/**
 * Genera un refresh token con mayor duración
 * @param payload - Datos a incluir en el token
 * @returns Refresh token JWT
 */
export function generateRefreshToken(payload: JWTPayload): string {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET no está configurado');
  }

  try {
    const refreshOptions: SignOptions = {
      expiresIn: REFRESH_TOKEN_EXPIRATION,
      algorithm: 'HS256',
    };
    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      jwtSecret as Secret,
      refreshOptions
    );
    
    return refreshToken;
  } catch (error) {
    console.error('Error al generar refresh token:', error);
    throw new Error('Error al generar refresh token');
  }
}

/**
 * Genera un par de tokens (access + refresh)
 * @param userData - Datos del usuario para incluir en el token
 * @returns Par de tokens
 */
export function generateTokenPair(userData: {
  userId: string;
  tenantId: string;
  email: string;
  role: 'owner' | 'admin' | 'staff';
  isPlatformAdmin?: boolean;
  tenantName?: string;
  planId?: string;
}): TokenPair {
  const payload: JWTPayload = {
    userId: userData.userId,
    tenantId: userData.tenantId,
    email: userData.email,
    role: userData.role,
    isPlatformAdmin: userData.isPlatformAdmin,
    tenantName: userData.tenantName,
    planId: userData.planId
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
}

/**
 * Verifica y decodifica un token JWT (compatible con Edge Runtime)
 * @param token - Token JWT a verificar
 * @returns Payload decodificado si es válido, null si es inválido
 */
export function verifyToken(token: string): JWTPayload | null {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    console.error('JWT_SECRET no está configurado');
    return null;
  }

  try {
    // Verificación completa del token con firma
    const decoded = jwt.verify(token, jwtSecret as Secret, {
      algorithms: ['HS256'],
    }) as JWTPayload;
    
    if (!decoded || !decoded.exp) {
      return null;
    }

    // Verificar expiración (doble verificación)
    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired) {
      // No loguear - es normal que los tokens expiren
      return null;
    }
    
    return decoded;
  } catch (error: any) {
    // No loguear errores de expiración - es normal
    // Solo loguear otros tipos de errores (firma inválida, formato incorrecto, etc.)
    if (error.name !== 'TokenExpiredError' && !error.message?.includes('expired')) {
      console.error('Error al verificar token:', error);
    }
    return null;
  }
}

/**
 * Verifica y decodifica un token JWT con verificación criptográfica completa
 * (Solo para usar en rutas de API del servidor, NO en middleware)
 * @param token - Token JWT a verificar
 * @returns Payload decodificado si es válido, null si es inválido
 */
export function verifyTokenServer(token: string): JWTPayload | null {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    console.error('JWT_SECRET no está configurado');
    return null;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret as Secret, {
      algorithms: ['HS256'],
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Token expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Token inválido');
    } else {
      console.error('Error al verificar token:', error);
    }
    return null;
  }
}

/**
 * Verifica si un token ha expirado
 * @param token - Token JWT a verificar
 * @returns true si ha expirado, false si no
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    
    if (!decoded || !decoded.exp) {
      return true;
    }

    // exp está en segundos, Date.now() en milisegundos
    const isExpired = decoded.exp * 1000 < Date.now();
    return isExpired;
  } catch (error) {
    console.error('Error al verificar expiración:', error);
    return true;
  }
}

/**
 * Decodifica un token sin verificar (útil para debugging)
 * @param token - Token JWT
 * @returns Payload decodificado o null
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Error al decodificar token:', error);
    return null;
  }
}

// ============================================
// UTILIDADES ADICIONALES
// ============================================

/**
 * Valida el formato de una contraseña
 * @param password - Contraseña a validar
 * @returns true si es válida, false si no
 */
export function isValidPassword(password: string): boolean {
  // Mínimo 8 caracteres
  if (password.length < 8) {
    return false;
  }
  
  // Al menos una letra y un número
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return hasLetter && hasNumber;
}

/**
 * Genera un secreto JWT aleatorio (para configuración inicial)
 * @returns String aleatorio para usar como JWT_SECRET
 */
export function generateJWTSecret(): string {
  const length = 64;
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let secret = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    secret += charset[randomIndex];
  }
  
  return secret;
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
// EXPORTACIONES DE CONFIGURACIÓN
// ============================================

export const AUTH_CONFIG = {
  bcryptRounds: BCRYPT_ROUNDS,
  jwtExpiration: JWT_EXPIRATION,
  refreshTokenExpiration: REFRESH_TOKEN_EXPIRATION,
  cookieName: 'auth_token',
  refreshCookieName: 'refresh_token'
} as const;

