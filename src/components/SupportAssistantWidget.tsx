'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MessageCircle, X, Send } from 'lucide-react';

type ChatMsg = { role: 'user' | 'assistant'; text: string };

type UsageInfo = {
  remaining: number;
  limit: number;
  resetLabel: string;
} | null;

function getScreenHint(): string {
  try {
    if (typeof window === 'undefined') return '';
    const path = window.location?.pathname || '';
    return path;
  } catch {
    return '';
  }
}

export default function SupportAssistantWidget() {
  const locale = useLocale();
  const t = useTranslations('supportAssistant');

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [usage, setUsage] = useState<UsageInfo>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const greeting = useMemo(
    () =>
      t('greeting') ||
      'Soy el Asistente de Delfín Check-in. Te ayudo con el uso del software (MIR, registros, propiedades, etc.). ¿Qué quieres hacer?',
    [t]
  );

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ role: 'assistant', text: greeting }]);
    }
  }, [open, msgs.length, greeting]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/support/usage')
      .then(r => r.json())
      .then(data => {
        if (data?.success && data.remaining !== undefined) {
          setUsage({
            remaining: data.remaining,
            limit: data.limit,
            resetLabel: data.resetLabel || '',
          });
        }
      })
      .catch(() => setUsage(null));
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMsgs(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          locale,
          screen: getScreenHint(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        const err =
          data?.error ||
          (res.status === 429 ? t('rateLimited') : t('genericError')) ||
          'No se pudo responder ahora.';
        setMsgs(prev => [...prev, { role: 'assistant', text: String(err) }]);
        if (data?.code === 'MONTHLY_LIMIT' || res.status === 429) {
          fetch('/api/support/usage').then(r => r.json()).then(d => {
            if (d?.success) setUsage({ remaining: d.remaining, limit: d.limit, resetLabel: d.resetLabel || '' });
          }).catch(() => {});
        }
        return;
      }
      if (data?.usage) {
        setUsage({
          remaining: data.usage.remaining,
          limit: data.usage.limit,
          resetLabel: data.usage.resetLabel || '',
        });
      }
      setMsgs(prev => [...prev, { role: 'assistant', text: String(data.text) }]);
    } catch (e) {
      setMsgs(prev => [
        ...prev,
        { role: 'assistant', text: t('genericError') || 'Error de red. Inténtalo de nuevo.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-blue-600 text-white px-4 py-3 shadow-lg hover:bg-blue-700"
          aria-label={t('open') || 'Abrir asistente'}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">{t('button') || 'Asistente'}</span>
        </button>
      ) : (
        <div className="w-[340px] sm:w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {t('title') || 'Asistente Delfín Check-in'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {t('subtitle') || 'Ayuda sobre uso del software (sin datos privados)'}
              </p>
              {usage !== null && (
                <p className="text-[11px] text-gray-600 mt-1">
                  {usage.remaining <= 50 && usage.remaining > 0 && (
                    <span className="text-amber-600 font-medium">
                      {t('usageWarning') || 'Te quedan pocos mensajes este mes. '}
                    </span>
                  )}
                  {t('usageRemaining') || 'Quedan'}{' '}
                  <strong>{usage.remaining}</strong>{' '}
                  {t('usageUntil') || 'mensajes hasta'}{' '}
                  {usage.resetLabel}.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-200"
              aria-label={t('close') || 'Cerrar'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t bg-gray-50">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={t('placeholder') || 'Escribe tu pregunta...'}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                disabled={loading}
              />
              <button
                type="button"
                onClick={send}
                disabled={loading || !input.trim()}
                className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                aria-label={t('send') || 'Enviar'}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            {usage !== null && usage.remaining <= 0 && (
              <p className="mt-2 text-[11px] text-amber-600 font-medium">
                {t('usageLimitReached') || 'Límite mensual alcanzado. Se reinicia el próximo mes.'}
              </p>
            )}
            <p className="mt-2 text-[11px] text-gray-500">
              {t('hint') ||
                'Consejo: di en qué pantalla estás y qué quieres conseguir (ej. “Configurar MIR”).'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

