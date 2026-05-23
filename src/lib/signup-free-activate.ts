import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { activateWaitlistEntryFromRow } from '@/lib/waitlist-activate-from-entry';
import { defaultLocale, isValidLocale, type Locale } from '@/i18n/config';

export type SignupFreeLocale = Locale;

const messages = {
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
    generic: "Impossible de terminer l'inscription. Réessayez plus tard.",
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

function dictFor(locale: string) {
  const key = (locale as keyof typeof messages) || 'es';
  return messages[key] || messages.es;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type SignupFreeActivateInput = {
  email: string;
  name?: string | null;
  source: string;
  notes?: string | null;
  locale?: string;
  req: NextRequest;
  bodyExtra?: Record<string, unknown>;
};

/**
 * Alta plan gratuito: waitlist + activación + email onboarding (magic link).
 * Usado por landing, Meta Lead Ads, etc.
 */
export async function signupFreeActivate(
  input: SignupFreeActivateInput
): Promise<NextResponse> {
  const email = normalizeEmail(input.email);
  const name = input.name?.trim() || null;
  const onboardingLocale =
    input.locale && isValidLocale(input.locale) ? input.locale : defaultLocale;
  const dict = dictFor(onboardingLocale);
  const bodyObj = input.bodyExtra ?? {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: dict.invalid }, { status: 400 });
  }

  try {
    const tenantCheck = await sql`SELECT id FROM tenants WHERE email = ${email} LIMIT 1`;
    if (tenantCheck.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: dict.hasAccount,
          alreadyActivated: true,
        },
        { status: 400 }
      );
    }

    const wl = await sql`
      SELECT id, email, name, activated_at, tenant_id, notes
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
          { status: 400 }
        );
      }
      if (input.notes && row.notes !== input.notes) {
        await sql`
          UPDATE waitlist
          SET
            name = COALESCE(${name}, name),
            source = ${input.source},
            notes = ${input.notes}
          WHERE id = ${row.id}
        `;
      }
      entry = { id: row.id, email: row.email, name: name || row.name };
    } else {
      const ins = await sql`
        INSERT INTO waitlist (email, name, source, notes)
        VALUES (${email}, ${name}, ${input.source}, ${input.notes ?? null})
        RETURNING id, email, name
      `;
      const created = ins.rows[0];
      entry = { id: created.id, email: created.email, name: created.name };
    }

    return activateWaitlistEntryFromRow(entry, input.req, bodyObj, {
      onboardingLocale,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[signup-free-activate]', error);
    if ((error as { code?: string })?.code === '23505') {
      return NextResponse.json({ success: false, error: dict.inProcess }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: dict.generic, details: msg }, { status: 500 });
  }
}

export async function waitlistNotesContainsLeadgenId(leadgenId: string): Promise<boolean> {
  const marker = `meta_leadgen_id=${leadgenId}`;
  const found = await sql`
    SELECT id FROM waitlist WHERE notes LIKE ${'%' + marker + '%'} LIMIT 1
  `;
  return found.rows.length > 0;
}
