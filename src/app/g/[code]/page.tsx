'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function GuestTapPage() {
  const params = useParams();
  const code = String(params?.code || '');
  const [space, setSpace] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/tap/public/${encodeURIComponent(code)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'No encontrado');
        setSpace(d.space);
      })
      .catch((e) => setError(e.message || 'Error'));
  }, [code]);

  const sendEmergency = async () => {
    setSending(true);
    try {
      const r = await fetch(`/api/tap/public/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, contact }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error');
      setSent(true);
      setMessage('');
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setSending(false);
    }
  };

  if (error && !space) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Enlace no disponible</h1>
        <p className="mt-2 text-slate-600">{error}</p>
      </main>
    );
  }

  if (!space) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-slate-500">Cargando…</main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white text-slate-900">
      <div className="mx-auto max-w-md px-4 py-10">
        <p className="text-sm font-semibold text-sky-700">Delfín Tap Wall</p>
        <h1 className="mt-1 text-3xl font-extrabold">{space.name || 'Tu alojamiento'}</h1>

        {(space.wifi_ssid || space.wifi_password) && (
          <section className="mt-8 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">WiFi</h2>
            {space.wifi_ssid ? (
              <p className="mt-2">
                Red: <strong>{space.wifi_ssid}</strong>
              </p>
            ) : null}
            {space.wifi_password ? (
              <p className="mt-1">
                Clave: <strong className="select-all">{space.wifi_password}</strong>
              </p>
            ) : null}
            {space.wifi_notes ? <p className="mt-2 text-sm text-slate-600">{space.wifi_notes}</p> : null}
          </section>
        )}

        {space.instructions_text ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Instrucciones</h2>
            <p className="mt-2 whitespace-pre-wrap text-slate-700">{space.instructions_text}</p>
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-bold text-amber-950">¿Necesitas ayuda?</h2>
          {space.emergency_phone ? (
            <p className="mt-2">
              Llama al propietario:{' '}
              <a className="font-semibold underline" href={`tel:${space.emergency_phone}`}>
                {space.emergency_phone}
              </a>
            </p>
          ) : null}
          {space.emergency_message ? (
            <p className="mt-2 text-sm text-amber-900">{space.emergency_message}</p>
          ) : null}
          {sent ? (
            <p className="mt-4 text-sm font-medium text-emerald-800">
              Aviso enviado al propietario. Si es una emergencia grave, llama al 112.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              <textarea
                rows={3}
                placeholder="Describe qué ocurre"
                className="w-full rounded-lg border border-amber-200 px-3 py-2"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <input
                placeholder="Tu teléfono o email (opcional)"
                className="w-full rounded-lg border border-amber-200 px-3 py-2"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
              <button
                type="button"
                disabled={sending || !message.trim()}
                onClick={sendEmergency}
                className="w-full rounded-lg bg-amber-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {sending ? 'Enviando…' : 'Avisar al propietario'}
              </button>
              <p className="text-xs text-amber-900/70">
                Esto avisa al propietario. No sustituye al 112 en emergencias graves.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
