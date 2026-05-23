import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signupFreeActivate } from '@/lib/signup-free-activate';
import { defaultLocale, isValidLocale } from '@/i18n/config';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const BodySchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().max(200).optional(),
  locale: z.string().max(8).optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Access-Control-Max-Age': '86400',
    },
  });
}

function withCors(res: NextResponse): NextResponse {
  const h = new Headers(res.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => h.set(k, v));
  return new NextResponse(res.body, { status: res.status, headers: h });
}

/**
 * Alta plan gratuito desde la landing: crea fila waitlist (si hace falta) y activa al momento
 * enviando el email de onboarding (mismo flujo que activación superadmin).
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    const locFromBody =
      typeof raw === 'object' && raw !== null ? String((raw as Record<string, unknown>)?.locale || '') : '';
    const onboardingLocale =
      locFromBody && isValidLocale(locFromBody) ? locFromBody : defaultLocale;

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { success: false, error: 'Datos inválidos', details: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    const { email, name } = parsed.data;
    const bodyObj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

    const activateRes = await signupFreeActivate({
      email,
      name: name || null,
      source: 'landing_free',
      notes: null,
      locale: onboardingLocale,
      req,
      bodyExtra: bodyObj,
    });
    return withCors(activateRes);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[signup-free]', error);
    return withCors(
      NextResponse.json({ success: false, error: 'No se pudo completar el registro.', details: msg }, { status: 500 })
    );
  }
}
