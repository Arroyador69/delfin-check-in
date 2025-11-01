/**
 * Sentry Edge Configuration
 * 
 * Configuración de Sentry para Edge Runtime
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Rate limiting para edge
  tracesSampleRate: 0.01, // 1% de transacciones en edge
  sampleRate: 1.0, // 100% de errores
  
  // Debug mode
  debug: process.env.NODE_ENV === 'development',
  
  // Tags adicionales
  environment: process.env.NODE_ENV || 'production',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
});

