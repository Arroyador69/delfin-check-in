/**
 * Sentry Client Configuration
 * 
 * Configuración de Sentry para el lado del cliente
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Rate limiting
  tracesSampleRate: 0.1, // 10% de transacciones
  sampleRate: 1.0, // 100% de errores (importante para no perder ninguno)
  
  // Debug mode solo en desarrollo
  debug: process.env.NODE_ENV === 'development',
  
  // Integraciones
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Filtrado de errores
  beforeSend(event, hint) {
    // Filtrar errores que no son importantes
    if (event.exception) {
      const error = hint.originalException || hint.syntheticException;
      const errorMessage = error?.toString() || '';
      
      // No capturar errores de red conocidos
      if (errorMessage.includes('NetworkError') || 
          errorMessage.includes('Failed to fetch')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Tags adicionales
  environment: process.env.NODE_ENV || 'production',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
});

