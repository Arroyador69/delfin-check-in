import Stripe from 'stripe';

export const STRIPE_API_VERSION = '2025-08-27.basil' as const;

let stripeInstance: Stripe | undefined;

/**
 * Cliente Stripe para rutas API. Inicialización perezosa para que `next build`
 * no falle cuando no hay STRIPE_SECRET_KEY (p. ej. CI local sin .env).
 */
export function getStripeServer(): Stripe {
  if (stripeInstance) return stripeInstance;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY no está configurada');
  }
  stripeInstance = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
  });
  return stripeInstance;
}
