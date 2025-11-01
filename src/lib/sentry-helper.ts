/**
 * 🔧 Sentry Helper
 * 
 * Utilidades para enriquecer errores en Sentry con contexto
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Captura un error con contexto de tenant
 */
export function captureErrorWithContext(
  error: Error,
  context: {
    tenantId?: string;
    userId?: string;
    email?: string;
    extra?: Record<string, any>;
  } = {}
) {
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
}

/**
 * Captura un mensaje con severidad
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context: {
    tenantId?: string;
    extra?: Record<string, any>;
  } = {}
) {
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

