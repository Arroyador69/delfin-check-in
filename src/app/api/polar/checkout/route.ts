import { Checkout } from '@polar-sh/nextjs';

/**
 * Polar checkout redirection (SaaS subscriptions).
 *
 * Se usa como endpoint "GET" que redirige al checkout alojado de Polar.
 * Ejemplo:
 * - /api/polar/checkout?products=PROD_ID&metadata=%7B%22tenant_id%22%3A%22...%22%7D
 */
export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  successUrl:
    process.env.POLAR_SUCCESS_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/es/settings/billing?polar=success&checkout_id={CHECKOUT_ID}`,
  returnUrl: process.env.POLAR_RETURN_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  server: (process.env.POLAR_SERVER as 'sandbox' | 'production' | undefined) || 'sandbox',
});

