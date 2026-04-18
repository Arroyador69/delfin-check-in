import type Stripe from 'stripe';

/**
 * Stripe API devuelve current_period_end en segundos; en tipos recientes del SDK
 * a veces no figura en la interfaz Subscription.
 */
export function subscriptionCurrentPeriodEndUnix(sub: Stripe.Subscription): number {
  const u = sub as unknown as { current_period_end?: number };
  return typeof u.current_period_end === 'number' ? u.current_period_end : 0;
}
