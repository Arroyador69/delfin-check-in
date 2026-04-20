/**
 * Sentry Client Configuration (App Router / Next.js instrumentation)
 *
 * Next.js cargará automáticamente este archivo en el cliente.
 * Esto reemplaza el uso de `sentry.client.config.ts` (deprecado con Turbopack).
 */
import * as Sentry from '@sentry/nextjs';
import { isNextJsNavigationControlError } from '@/lib/sentry-filter-next-navigation';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,
  sampleRate: 1.0,
  debug: process.env.NODE_ENV === 'development',

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  beforeSend(event, hint) {
    if (isNextJsNavigationControlError(hint.originalException)) {
      return null;
    }

    if (event.exception) {
      const error = hint.originalException || hint.syntheticException;
      const errorMessage = error?.toString() || '';

      if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        return null;
      }
    }

    return event;
  },

  environment: process.env.NODE_ENV || 'production',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
});

// Recomendado por Sentry para instrumentar navegaciones en App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

