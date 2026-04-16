import type { Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Carga Stripe.js de forma perezosa y tolerante a fallos (Safari móvil, bloqueadores, red).
 * Evita rechazar la promesa para no disparar errores no controlados en Sentry.
 */
export function getStripePromise(): Promise<Stripe | null> {
  const key =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '' : '';
  if (!key) {
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = import('@stripe/stripe-js')
      .then(({ loadStripe }) => loadStripe(key))
      .catch((err) => {
        console.warn('[stripe] No se pudo cargar Stripe.js:', err);
        return null;
      });
  }
  return stripePromise;
}
