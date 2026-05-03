import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { denyDebugApiInProduction } from '@/lib/security-deployment';

/**
 * Solo desarrollo / diagnóstico local. En producción el middleware ya devuelve 404;
 * aquí reforzamos por si la ruta se sirviera sin middleware.
 */
export async function GET(_req: NextRequest) {
  const denied = denyDebugApiInProduction();
  if (denied) return denied;

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    const frontendKey = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').trim();

    if (!secretKey) {
      return NextResponse.json(
        {
          error: 'STRIPE_SECRET_KEY no configurada',
          backend_key: null,
          frontend_key_configured: Boolean(frontendKey),
        },
        { status: 500 }
      );
    }

    if (!frontendKey) {
      return NextResponse.json(
        {
          error: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no configurada',
          hint: 'Define la clave pública en .env / Vercel para comparar con STRIPE_SECRET_KEY.',
        },
        { status: 400 }
      );
    }

    const isTest = secretKey.startsWith('sk_test_');
    const isLive = secretKey.startsWith('sk_live_');
    const keyPrefix = secretKey.substring(0, 12);

    const frontendIsTest = frontendKey.startsWith('pk_test_');
    const frontendIsLive = frontendKey.startsWith('pk_live_');
    const frontendKeyPrefix = frontendKey.substring(0, 12);

    let stripeWorks = false;
    let stripeError: string | null = null;
    let accountInfo: Record<string, unknown> | null = null;

    try {
      const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' });
      const account = await stripe.account.retrieve();
      stripeWorks = true;
      accountInfo = {
        id: account.id,
        email: account.email,
        country: account.country,
        default_currency: account.default_currency,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      };
    } catch (err: unknown) {
      stripeWorks = false;
      stripeError = err instanceof Error ? err.message : String(err);
    }

    const frontendAccountId = frontendKey.match(/pk_(test|live)_([A-Za-z0-9]+)/)?.[2]?.substring(0, 8);
    const backendAccountId = secretKey.match(/sk_(test|live)_([A-Za-z0-9]+)/)?.[2]?.substring(0, 8);

    const keysMatch =
      Boolean(frontendAccountId && backendAccountId && frontendAccountId === backendAccountId) &&
      isTest === frontendIsTest &&
      isLive === frontendIsLive;

    return NextResponse.json({
      success: true,
      keys_match: keysMatch,
      backend: {
        key_prefix: keyPrefix,
        key_mode: isTest ? 'test' : isLive ? 'live' : 'unknown',
        account_id_prefix: backendAccountId,
        stripe_works: stripeWorks,
        error: stripeError,
        account: accountInfo,
      },
      frontend: {
        key_prefix: frontendKeyPrefix,
        key_mode: frontendIsTest ? 'test' : frontendIsLive ? 'live' : 'unknown',
        account_id_prefix: frontendAccountId,
        key_preview: `${frontendKey.substring(0, 12)}…`,
      },
      recommendation: keysMatch
        ? 'Las claves parecen coincidir (mismo prefijo de cuenta y modo test/live).'
        : 'Las claves no coinciden: revisa STRIPE_SECRET_KEY y NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY en el mismo proyecto Stripe.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error verificando claves',
        success: false,
      },
      { status: 500 }
    );
  }
}
