/**
 * Sentry Server Configuration
 * 
 * Configuración de Sentry para el lado del servidor
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Rate limiting
  tracesSampleRate: 0.1, // 10% de transacciones
  sampleRate: 1.0, // 100% de errores en servidor
  
  // Debug mode solo en desarrollo
  debug: process.env.NODE_ENV === 'development',
  
  // Integraciones para servidor
  integrations: [
    Sentry.nodeProfilingIntegration(),
  ],
  
  // Filtrado de errores
  beforeSend(event, hint) {
    // Enriquecer con información adicional
    if (event.contexts) {
      // Añadir información del tenant si está disponible
      const user = event.user;
      if (user && 'tenantId' in user) {
        event.tags = {
          ...event.tags,
          tenant_id: user.tenantId as string,
        };
      }
    }
    
    return event;
  },
  
  // Tags adicionales
  environment: process.env.NODE_ENV || 'production',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
});

