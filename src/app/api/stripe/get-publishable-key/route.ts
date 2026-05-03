import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint para obtener la clave pública de Stripe que corresponde a la clave secreta del backend
 * Esto asegura que el frontend use la clave pública correcta
 */
export async function GET(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    const publishableFromEnv = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').trim();
    
    if (!secretKey) {
      return NextResponse.json({ 
        error: 'STRIPE_SECRET_KEY no configurada',
      }, { status: 500 })
    }

    // Extraer el prefijo de la cuenta de la clave secreta
    // sk_test_51XXXXXX... -> pk_test_51XXXXXX...
    const isTest = secretKey.startsWith('sk_test_')
    const isLive = secretKey.startsWith('sk_live_')
    
    if (!isTest && !isLive) {
      return NextResponse.json({ 
        error: 'Formato de clave secreta no válido',
      }, { status: 500 })
    }

    // Extraer el ID de la cuenta (los primeros caracteres después del prefijo)
    const accountIdMatch = secretKey.match(/sk_(test|live)_([A-Za-z0-9]+)/)
    if (!accountIdMatch || !accountIdMatch[2]) {
      return NextResponse.json({ 
        error: 'No se pudo extraer el ID de cuenta de la clave secreta',
      }, { status: 500 })
    }

    const accountIdPrefix = accountIdMatch[2].substring(0, 8);
    const keyPrefix = isTest ? 'pk_test_' : 'pk_live_';

    const pubMatch = publishableFromEnv.match(/pk_(test|live)_([A-Za-z0-9]+)/);
    const pubAccountPrefix = pubMatch?.[2]?.substring(0, 8) ?? null;
    const keysMatch =
      Boolean(publishableFromEnv && pubAccountPrefix && pubAccountPrefix === accountIdPrefix) &&
      ((isTest && publishableFromEnv.startsWith('pk_test_')) ||
        (isLive && publishableFromEnv.startsWith('pk_live_')));

    const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com';
    const res = NextResponse.json({
      success: true,
      account_id_prefix: accountIdPrefix,
      key_prefix: keyPrefix,
      mode: isTest ? 'test' : 'live',
      instruction: `La clave pública debe empezar con: ${keyPrefix}${accountIdPrefix}...`,
      note: 'Obtén la clave pública completa desde: https://dashboard.stripe.com/test/apikeys (o /apikeys para live)',
      current_frontend_key_preview: publishableFromEnv
        ? `${publishableFromEnv.substring(0, 12)}…`
        : null,
      keys_match: keysMatch,
      recommendation: publishableFromEnv
        ? keysMatch
          ? 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY coincide con STRIPE_SECRET_KEY (mismo prefijo de cuenta).'
          : 'Ajusta NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY para que coincida con la cuenta de STRIPE_SECRET_KEY.'
        : `Configura NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY con una clave que empiece por ${keyPrefix}${accountIdPrefix}...`,
    });
    
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    return res;
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error obteniendo información de claves',
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  const allowedOrigin = process.env.ALLOWED_LANDING_ORIGIN || 'https://delfincheckin.com';
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

