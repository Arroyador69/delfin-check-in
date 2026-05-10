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
    const locFromBody =
      typeof raw === 'object' && raw !== null ? String((raw as Record<string, unknown>)?.locale || '') : '';
    const onboardingLocale =
      locFromBody && isValidLocale(locFromBody) ? locFromBody : defaultLocale;

    const msg = {
      es: {
        invalid: 'Datos inválidos',
        hasAccount: 'Este email ya tiene una cuenta. Revisa tu correo o inicia sesión.',
        alreadyRegistered: 'Este email ya está registrado. Revisa tu correo o inicia sesión.',
        inProcess: 'Este email ya está en proceso. Revisa tu correo.',
        generic: 'No se pudo completar el registro. Inténtalo más tarde.',
      },
      en: {
        invalid: 'Invalid data',
        hasAccount: 'This email already has an account. Check your inbox or log in.',
        alreadyRegistered: 'This email is already registered. Check your inbox or log in.',
        inProcess: 'This email is already being processed. Check your inbox.',
        generic: "We couldn't complete the signup. Please try again later.",
      },
      it: {
        invalid: 'Dati non validi',
        hasAccount: 'Questa email ha già un account. Controlla la posta o accedi.',
        alreadyRegistered: 'Questa email è già registrata. Controlla la posta o accedi.',
        inProcess: 'Questa email è già in elaborazione. Controlla la posta.',
        generic: 'Non è stato possibile completare la registrazione. Riprova più tardi.',
      },
      pt: {
        invalid: 'Dados inválidos',
        hasAccount: 'Este email já tem uma conta. Verifique a sua caixa de entrada ou inicie sessão.',
        alreadyRegistered: 'Este email já está registado. Verifique a sua caixa de entrada ou inicie sessão.',
        inProcess: 'Este email já está em processamento. Verifique a sua caixa de entrada.',
        generic: 'Não foi possível concluir o registo. Tente novamente mais tarde.',
      },
      fr: {
        invalid: 'Données invalides',
        hasAccount: 'Cet e-mail a déjà un compte. Vérifiez votre boîte mail ou connectez-vous.',
        alreadyRegistered: 'Cet e-mail est déjà enregistré. Vérifiez votre boîte mail ou connectez-vous.',
        inProcess: 'Cet e-mail est déjà en cours de traitement. Vérifiez votre boîte mail.',
        generic: "Impossible de terminer l’inscription. Réessayez plus tard.",
      },
      fi: {
        invalid: 'Virheelliset tiedot',
        hasAccount: 'Tällä sähköpostilla on jo tili. Tarkista postisi tai kirjaudu sisään.',
        alreadyRegistered: 'Tämä sähköposti on jo rekisteröity. Tarkista postisi tai kirjaudu sisään.',
        inProcess: 'Tämä sähköposti on jo käsittelyssä. Tarkista postisi.',
        generic: 'Rekisteröintiä ei voitu suorittaa. Yritä myöhemmin uudelleen.',
      },
      sv: {
        invalid: 'Ogiltiga uppgifter',
        hasAccount: 'Den här e‑postadressen har redan ett konto. Kolla inkorgen eller logga in.',
        alreadyRegistered: 'Den här e‑postadressen är redan registrerad. Kolla inkorgen eller logga in.',
        inProcess: 'Den här e‑postadressen behandlas redan. Kolla inkorgen.',
        generic: 'Det gick inte att slutföra registreringen. Försök igen senare.',
      },
    } as const;
    const dict = msg[(onboardingLocale as keyof typeof msg) || 'es'] || msg.es;

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: dict.invalid, details: parsed.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }

    const { email, name } = parsed.data;
    const bodyObj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

    const tenantCheck = await sql`SELECT id FROM tenants WHERE email = ${email} LIMIT 1`;
    if (tenantCheck.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: dict.hasAccount,
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
            error: dict.alreadyRegistered,
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
        { success: false, error: dict.inProcess },
        { status: 400, headers: corsHeaders }
      );
    }
    return NextResponse.json(
      { success: false, error: dict.generic, details: msg },
      { status: 500, headers: corsHeaders }
    );
  }
}
