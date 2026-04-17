'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function normalizeLang(raw: string | null): 'es' | 'en' | 'fr' | 'it' | 'pt' {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'es' || v === 'en' || v === 'fr' || v === 'it' || v === 'pt') return v;
  return 'en';
}

const copy: Record<
  'es' | 'en' | 'fr' | 'it' | 'pt',
  {
    title: string;
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    cta: string;
    success: string;
    already: string;
    error: string;
    goLogin: string;
  }
> = {
  es: {
    title: 'Crear cuenta',
    subtitle: 'Déjanos tu email y te enviaremos acceso cuando esté disponible.',
    emailLabel: 'Email',
    emailPlaceholder: 'tu@email.com',
    cta: 'Unirme',
    success: 'Listo. Revisa tu email: te avisaremos cuando tengas acceso.',
    already: 'Este email ya está en lista de espera o ya tiene cuenta activa.',
    error: 'No se pudo completar. Inténtalo de nuevo.',
    goLogin: 'Ir a iniciar sesión',
  },
  en: {
    title: 'Create account',
    subtitle: 'Leave your email and we’ll send you access when it’s available.',
    emailLabel: 'Email',
    emailPlaceholder: 'your@email.com',
    cta: 'Join',
    success: 'Done. Check your email—we’ll notify you when you have access.',
    already: 'This email is already on the waitlist or has an active account.',
    error: 'Could not complete. Please try again.',
    goLogin: 'Go to login',
  },
  fr: {
    title: 'Créer un compte',
    subtitle: 'Laissez votre e-mail et nous vous enverrons l’accès quand il sera disponible.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'votre@email.com',
    cta: 'Rejoindre',
    success: 'C’est fait. Vérifiez votre e-mail : nous vous préviendrons quand vous aurez accès.',
    already: 'Cet e-mail est déjà sur la liste d’attente ou a un compte actif.',
    error: 'Impossible de terminer. Réessayez.',
    goLogin: 'Aller à la connexion',
  },
  it: {
    title: 'Crea account',
    subtitle: 'Lascia la tua email e ti invieremo l’accesso quando sarà disponibile.',
    emailLabel: 'Email',
    emailPlaceholder: 'tua@email.com',
    cta: 'Unisciti',
    success: 'Fatto. Controlla la tua email: ti avviseremo quando avrai accesso.',
    already: 'Questa email è già in lista d’attesa o ha un account attivo.',
    error: 'Impossibile completare. Riprova.',
    goLogin: 'Vai al login',
  },
  pt: {
    title: 'Criar conta',
    subtitle: 'Deixa o teu email e enviamos o acesso quando estiver disponível.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'seu@email.com',
    cta: 'Aderir',
    success: 'Feito. Verifica o teu email: avisamos quando tiveres acesso.',
    already: 'Este email já está na lista de espera ou tem conta ativa.',
    error: 'Não foi possível concluir. Tenta novamente.',
    goLogin: 'Ir para login',
  },
};

export default function SignupPage() {
  const sp = useSearchParams();
  const lang = normalizeLang(sp.get('lang'));
  const source = sp.get('source') || 'web';
  const c = useMemo(() => copy[lang], [lang]);

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'already'>('idle');

  async function submit() {
    const v = email.trim().toLowerCase();
    if (!v) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setStatus('success');
        return;
      }
      if (data?.alreadyInWaitlist || data?.alreadyActivated) {
        setStatus('already');
        return;
      }
      setStatus('error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-blue-100">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-center">
            <div className="text-5xl mb-2">🐬</div>
            <h1 className="text-2xl font-bold text-white">{c.title}</h1>
            <p className="text-blue-100 text-sm mt-1">{c.subtitle}</p>
          </div>

          <div className="px-8 py-8 space-y-4">
            <label className="block text-sm font-semibold text-gray-700">{c.emailLabel}</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={c.emailPlaceholder}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              autoComplete="email"
            />

            <button
              onClick={submit}
              disabled={status === 'loading' || !email.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {status === 'loading' ? '…' : c.cta}
            </button>

            {status === 'success' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                {c.success}
              </div>
            ) : null}
            {status === 'already' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                {c.already}
              </div>
            ) : null}
            {status === 'error' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {c.error}
              </div>
            ) : null}

            <div className="text-center pt-2">
              <Link href="/admin-login" className="text-sm text-blue-700 hover:underline font-semibold">
                {c.goLogin}
              </Link>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-4">
          {source === 'mobile' ? 'Mobile' : 'Web'} · lang={lang}
        </p>
      </div>
    </div>
  );
}

