/**
 * 🔧 Sentry Helper
 * 
 * Utilidades para enriquecer errores en Sentry con contexto
 * También guarda errores en la base de datos para el superadmin
 */

import * as Sentry from '@sentry/nextjs'
import { logError } from './error-logger'

/**
 * Captura un error con contexto de tenant
 * También guarda el error en la base de datos para el superadmin
 */
export async function captureErrorWithContext(
  error: Error,
  context: {
    tenantId?: string;
    userId?: string;
    email?: string;
    extra?: Record<string, any>;
    url?: string;
    level?: 'error' | 'warning' | 'info';
  } = {}
) {
  // Capturar en Sentry
  Sentry.withScope((scope) => {
    // Tags
    if (context.tenantId) {
      scope.setTag('tenant_id', context.tenantId);
    }
    if (context.userId) {
      scope.setUser({ id: context.userId, email: context.email });
    }
    
    // Contexto adicional
    if (context.extra) {
      scope.setContext('additional_data', context.extra);
    }
    
    // Capturar error
    Sentry.captureException(error);
  });

  // Guardar en base de datos para el superadmin (no bloquea si falla)
  try {
    await logError({
      level: context.level || 'error',
      message: error.message || 'Error desconocido',
      error: error,
      tenantId: context.tenantId || null,
      userId: context.userId || null,
      url: context.url || null,
      metadata: {
        ...context.extra,
        errorName: error.name,
        stack: error.stack,
      },
    });
  } catch (dbError) {
    // No lanzar error si falla el guardado en DB para no crear bucles
    console.error('Error guardando log en DB:', dbError);
  }
}

/**
 * Captura un mensaje con severidad
 * También guarda el mensaje en la base de datos para el superadmin
 */
export async function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context: {
    tenantId?: string;
    extra?: Record<string, any>;
    url?: string;
  } = {}
) {
  // Capturar en Sentry
  Sentry.withScope((scope) => {
    // Tags
    if (context.tenantId) {
      scope.setTag('tenant_id', context.tenantId);
    }
    
    // Contexto adicional
    if (context.extra) {
      scope.setContext('additional_data', context.extra);
    }
    
    // Capturar mensaje
    Sentry.captureMessage(message, level);
  });

  // Guardar en base de datos solo para warnings y errors (no bloquea si falla)
  const dbLevel = level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info';
  
  if (dbLevel !== 'info') {
    try {
      await logError({
        level: dbLevel,
        message,
        tenantId: context.tenantId || null,
        url: context.url || null,
        metadata: context.extra,
      });
    } catch (dbError) {
      // No lanzar error si falla el guardado en DB
      console.error('Error guardando mensaje en DB:', dbError);
    }
  }
}

/**
 * Contexto de transacción para operaciones importantes
 */
export async function withSentryTransaction<T>(
  name: string,
  op: string,
  callback: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan({
    name,
    op,
  }, async () => {
    return await callback();
  });
}

