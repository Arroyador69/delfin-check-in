import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { activateWaitlistEntryFromRow } from '@/lib/waitlist-activate-from-entry';
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

/**
 * Alta plan gratuito desde la landing: crea fila waitlist (si hace falta) y activa al momento
 * enviando el email de onboarding (mismo flujo que activación superadmin).
 */
function withCors(res: NextResponse): NextResponse {
  const h = new Headers(res.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => h.set(k, v));
  return new NextResponse(res.body, { status: res.status, headers: h });
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }

    const { email, name } = parsed.data;
    const loc = parsed.data.locale;
    const onboardingLocale = loc && isValidLocale(loc) ? loc : defaultLocale;
    const bodyObj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

    const tenantCheck = await sql`SELECT id FROM tenants WHERE email = ${email} LIMIT 1`;
    if (tenantCheck.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Este email ya tiene una cuenta. Revisa tu correo o inicia sesión.',
          alreadyActivated: true,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const wl = await sql`
      SELECT id, email, name, activated_at, tenant_id
      FROM waitlist
      WHERE email = ${email}
      LIMIT 1
    `;

    let entry: { id: string; email: string; name: string | null };

    if (wl.rows.length > 0) {
      const row = wl.rows[0];
      if (row.activated_at) {
        return NextResponse.json(
          {
            success: false,
            error: 'Este email ya está registrado. Revisa tu correo o inicia sesión.',
            alreadyActivated: true,
          },
          { status: 400, headers: corsHeaders }
        );
      }
      entry = { id: row.id, email: row.email, name: row.name };
    } else {
      const ins = await sql`
        INSERT INTO waitlist (email, name, source, notes)
        VALUES (${email}, ${name || null}, ${'landing_free'}, ${null})
        RETURNING id, email, name
      `;
      const created = ins.rows[0];
      entry = { id: created.id, email: created.email, name: created.name };
    }

    const activateRes = await activateWaitlistEntryFromRow(entry, req, bodyObj, {
      onboardingLocale,
    });
    return withCors(activateRes);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[signup-free]', error);
    if ((error as { code?: string })?.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Este email ya está en proceso. Revisa tu correo.' },
        { status: 400, headers: corsHeaders }
      );
    }
    return NextResponse.json(
      { success: false, error: 'No se pudo completar el registro. Inténtalo más tarde.', details: msg },
      { status: 500, headers: corsHeaders }
    );
  }
}
