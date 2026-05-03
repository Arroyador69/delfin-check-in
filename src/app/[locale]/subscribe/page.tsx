'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { isValidLocale, type Locale } from '@/i18n/config';

type PlanKey = 'checkin' | 'standard' | 'pro';

const COPY: Record<
  Locale,
  {
    title: string;
    intro: string;
    storesNote: string;
    seats: string;
    monthly: string;
    yearly: string;
    cta: string;
    success: string;
    loginHint: string;
    plans: Record<PlanKey, { name: string; blurb: string; price: string }>;
  }
> = {
  es: {
    title: 'Planes y pago seguro',
    intro:
      'Elige tu plan y completa el pago en Polar (navegador). La suscripción del software no se cobra dentro de las apps móviles.',
    storesNote:
      'Cumplimos con las normas de App Store y Google Play: el cobro recurrente del servicio se gestiona fuera de la app, en la web.',
    seats: 'Unidades (asientos)',
    monthly: 'Mensual',
    yearly: 'Anual',
    cta: 'Continuar con Polar',
    success:
      'Pago recibido. Si es tu primera vez, revisa tu correo en unos minutos para crear tu acceso y el onboarding.',
    loginHint: '¿Ya tienes cuenta?',
    plans: {
      checkin: {
        name: 'Check-in',
        blurb: 'Módulo legal MIR y check-in digital.',
        price: 'desde 2 €/mes',
      },
      standard: {
        name: 'Standard',
        blurb: 'Sin anuncios en el panel y más capacidad.',
        price: 'desde 9,99 €/mes',
      },
      pro: {
        name: 'Pro',
        blurb: 'Máxima capacidad y funciones avanzadas.',
        price: 'desde 29,99 €/mes',
      },
    },
  },
  en: {
    title: 'Plans & secure checkout',
    intro:
      'Choose your plan and complete payment with Polar in your browser. Software subscriptions are not purchased inside the mobile apps.',
    storesNote:
      'We follow App Store and Google Play rules: recurring service billing happens on the web, outside the app.',
    seats: 'Units (seats)',
    monthly: 'Monthly',
    yearly: 'Yearly',
    cta: 'Continue with Polar',
    success:
      'Payment received. If you are new, check your email shortly to finish access and onboarding.',
    loginHint: 'Already have an account?',
    plans: {
      checkin: {
        name: 'Check-in',
        blurb: 'MIR legal module and digital check-in.',
        price: 'from €2/mo',
      },
      standard: {
        name: 'Standard',
        blurb: 'No ads in the dashboard and more capacity.',
        price: 'from €9.99/mo',
      },
      pro: {
        name: 'Pro',
        blurb: 'Highest capacity and advanced features.',
        price: 'from €29.99/mo',
      },
    },
  },
  fr: {
    title: 'Offres et paiement sécurisé',
    intro:
      'Choisissez votre offre et payez avec Polar dans le navigateur. L’abonnement logiciel n’est pas facturé dans les applications mobiles.',
    storesNote:
      'Conformité App Store / Google Play : la facturation récurrente du service se fait sur le web, hors application.',
    seats: 'Unités (sièges)',
    monthly: 'Mensuel',
    yearly: 'Annuel',
    cta: 'Continuer avec Polar',
    success:
      'Paiement reçu. Si c’est votre première fois, vérifiez votre e-mail pour l’accès et l’onboarding.',
    loginHint: 'Vous avez déjà un compte ?',
    plans: {
      checkin: { name: 'Check-in', blurb: 'Module légal MIR et check-in numérique.', price: 'dès 2 €/mois' },
      standard: { name: 'Standard', blurb: 'Sans pubs et plus de capacité.', price: 'dès 9,99 €/mois' },
      pro: { name: 'Pro', blurb: 'Capacité maximale.', price: 'dès 29,99 €/mois' },
    },
  },
  it: {
    title: 'Piani e pagamento sicuro',
    intro:
      'Scegli il piano e paga con Polar nel browser. L’abbonamento al software non viene acquistato nelle app mobili.',
    storesNote:
      'Rispetto delle regole App Store e Google Play: l’addebito ricorrente avviene sul web, fuori dall’app.',
    seats: 'Unità (posti)',
    monthly: 'Mensile',
    yearly: 'Annuale',
    cta: 'Continua con Polar',
    success:
      'Pagamento ricevuto. Se è la prima volta, controlla l’email per l’accesso e l’onboarding.',
    loginHint: 'Hai già un account?',
    plans: {
      checkin: { name: 'Check-in', blurb: 'Modulo legale MIR e check-in digitale.', price: 'da 2 €/mese' },
      standard: { name: 'Standard', blurb: 'Senza annunci e più capacità.', price: 'da 9,99 €/mese' },
      pro: { name: 'Pro', blurb: 'Massima capacità.', price: 'da 29,99 €/mese' },
    },
  },
  pt: {
    title: 'Planos e pagamento seguro',
    intro:
      'Escolha o plano e pague com Polar no navegador. A subscrição do software não é cobrada nas apps móveis.',
    storesNote:
      'Em conformidade com App Store e Google Play: a faturação recorrente faz-se na web, fora da app.',
    seats: 'Unidades (lugares)',
    monthly: 'Mensal',
    yearly: 'Anual',
    cta: 'Continuar com Polar',
    success:
      'Pagamento recebido. Se for a primeira vez, verifique o email para o acesso e onboarding.',
    loginHint: 'Já tem conta?',
    plans: {
      checkin: { name: 'Check-in', blurb: 'Módulo legal MIR e check-in digital.', price: 'desde 2 €/mês' },
      standard: { name: 'Standard', blurb: 'Sem anúncios e mais capacidade.', price: 'desde 9,99 €/mês' },
      pro: { name: 'Pro', blurb: 'Máxima capacidade.', price: 'desde 29,99 €/mês' },
    },
  },
  fi: {
    title: 'Suunnitelmat ja turvallinen maksu',
    intro:
      'Valitse suunnitelma ja maksa Polarilla selaimessa. Ohjelmiston tilaus ei tapahdu mobiilisovelluksissa.',
    storesNote:
      'App Store / Google Play ‑säännöt: toistuva veloitus tapahtuu verkossa, sovelluksen ulkopuolella.',
    seats: 'Yksiköt (paikat)',
    monthly: 'Kuukausi',
    yearly: 'Vuosi',
    cta: 'Jatka Polarilla',
    success:
      'Maksu vastaanotettu. Jos olet uusi, tarkista sähköpostisi käyttöoikeutta ja onboardingia varten.',
    loginHint: 'Onko sinulla jo tili?',
    plans: {
      checkin: { name: 'Check-in', blurb: 'MIR-oikeusmoduuli ja digitaalinen sisäänkirjautuminen.', price: 'alk. 2 €/kk' },
      standard: { name: 'Standard', blurb: 'Ei mainoksia ja enemmän kapasiteettia.', price: 'alk. 9,99 €/kk' },
      pro: { name: 'Pro', blurb: 'Suurin kapasiteetti.', price: 'alk. 29,99 €/kk' },
    },
  },
};

function subscribeRedirectHref(
  plan: PlanKey,
  locale: string,
  seats: number,
  interval: 'month' | 'year'
): string {
  const q = new URLSearchParams({
    plan,
    locale,
    seats: String(seats),
    interval,
  });
  return `/api/polar/subscribe-redirect?${q.toString()}`;
}

export default function SubscribePage() {
  const rawLocale = useLocale();
  const locale = isValidLocale(rawLocale) ? rawLocale : 'es';
  const sp = useSearchParams();
  const polarOk = sp.get('polar_success') === '1';

  const [seats, setSeats] = useState(1);
  const [interval, setInterval] = useState<'month' | 'year'>('month');

  const t = useMemo(() => COPY[locale] || COPY.en, [locale]);

  const decSeats = () => setSeats((s) => Math.max(1, s - 1));
  const incSeats = () => setSeats((s) => Math.min(99, s + 1));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>
      <p className="mt-3 text-slate-600 leading-relaxed">{t.intro}</p>
      <p className="mt-2 text-sm text-slate-500 leading-relaxed">{t.storesNote}</p>

      {polarOk && (
        <div
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 text-sm"
          role="status"
        >
          {t.success}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">{t.seats}</span>
          <button
            type="button"
            onClick={decSeats}
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-lg font-medium text-slate-700 hover:bg-slate-50"
            aria-label="-1"
          >
            −
          </button>
          <span className="min-w-[2ch] text-center font-semibold text-slate-900">{seats}</span>
          <button
            type="button"
            onClick={incSeats}
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-lg font-medium text-slate-700 hover:bg-slate-50"
            aria-label="+1"
          >
            +
          </button>
        </div>
        <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
          <button
            type="button"
            onClick={() => setInterval('month')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              interval === 'month' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600'
            }`}
          >
            {t.monthly}
          </button>
          <button
            type="button"
            onClick={() => setInterval('year')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              interval === 'year' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600'
            }`}
          >
            {t.yearly}
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {(['checkin', 'standard', 'pro'] as PlanKey[]).map((key) => (
          <div
            key={key}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-slate-900">{t.plans[key].name}</h2>
            <p className="mt-2 flex-1 text-sm text-slate-600">{t.plans[key].blurb}</p>
            <p className="mt-4 text-sm font-medium text-teal-700">{t.plans[key].price}</p>
            <a
              href={subscribeRedirectHref(key, locale, seats, interval)}
              className="mt-6 inline-flex justify-center rounded-xl bg-teal-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-teal-700"
            >
              {t.cta}
            </a>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-slate-600">
        {t.loginHint}{' '}
        <Link href="/admin-login" className="font-medium text-teal-700 underline underline-offset-2">
          {locale === 'es' ? 'Iniciar sesión' : 'Log in'}
        </Link>
      </p>
    </div>
  );
}
