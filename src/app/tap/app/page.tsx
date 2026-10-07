'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Space = {
  id: string;
  name: string;
  public_code: string;
  wifi_ssid?: string;
  wifi_password?: string;
  wifi_notes?: string;
  instructions_text?: string;
  emergency_phone?: string;
  emergency_message?: string;
};

export default function TapAppPage() {
  const [status, setStatus] = useState<any>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [selected, setSelected] = useState<Space | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const st = await fetch('/api/tap/status', { credentials: 'include' });
    const stData = await st.json();
    if (!st.ok) {
      setError(stData.error || 'Necesitas iniciar sesión');
      return;
    }
    setStatus(stData);
    if (!stData.account?.active) return;
    const sp = await fetch('/api/tap/spaces', { credentials: 'include' });
    const spData = await sp.json();
    if (sp.ok) {
      setSpaces(spData.spaces || []);
      if (!selected && spData.spaces?.[0]) setSelected(spData.spaces[0]);
    }
    const em = await fetch('/api/tap/emergencies', { credentials: 'include' });
    const emData = await em.json();
    if (em.ok) setEmergencies(emData.emergencies || []);
  }, [selected]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/tap/spaces', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setMsg('Guardado. El chip NFC puede apuntar a la URL pública de abajo.');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (error && !status) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Panel Tap Wall</h1>
        <p className="mt-3 text-slate-600">{error}</p>
        <a
          href="https://admin.delfincheckin.com/admin-login"
          className="mt-6 inline-block rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white"
        >
          Iniciar sesión en Delfín
        </a>
      </main>
    );
  }

  if (status && !status.account?.active) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-bold">Aún no tienes Tap Wall activo</h1>
        <p className="mt-3 text-slate-600">
          Contrata la suscripción (10 €/mes + 2 € por propiedad extra) para configurar WiFi,
          instrucciones y chips NFC.
        </p>
        <Link
          href="/contratar"
          className="mt-6 inline-block rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white"
        >
          Contratar ahora
        </Link>
      </main>
    );
  }

  const guestUrl = selected
    ? `https://g.delfincheckin.com/${selected.public_code}`
    : '';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">tap.delfincheckin.com</p>
            <h1 className="text-3xl font-extrabold">Panel Tap Wall</h1>
          </div>
          <Link href="/contratar" className="text-sm font-medium text-sky-700 underline">
            Cambiar plan / producto
          </Link>
        </div>

        {msg ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            {msg}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {spaces.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                selected?.id === s.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {selected ? (
          <div className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <label className="text-sm font-semibold">Nombre del alojamiento</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={selected.name || ''}
                onChange={(e) => setSelected({ ...selected, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">WiFi SSID</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={selected.wifi_ssid || ''}
                  onChange={(e) => setSelected({ ...selected, wifi_ssid: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">WiFi contraseña</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={selected.wifi_password || ''}
                  onChange={(e) => setSelected({ ...selected, wifi_password: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">Notas WiFi</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={selected.wifi_notes || ''}
                onChange={(e) => setSelected({ ...selected, wifi_notes: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Instrucciones para el huésped</label>
              <textarea
                rows={5}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={selected.instructions_text || ''}
                onChange={(e) => setSelected({ ...selected, instructions_text: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">Teléfono emergencia (opcional)</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={selected.emergency_phone || ''}
                  onChange={(e) => setSelected({ ...selected, emergency_phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Mensaje de emergencia</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={selected.emergency_message || ''}
                  onChange={(e) => setSelected({ ...selected, emergency_message: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p className="font-semibold">URL pública del chip NFC</p>
              <a href={guestUrl} className="mt-1 break-all text-sky-700 underline" target="_blank" rel="noreferrer">
                {guestUrl}
              </a>
              <p className="mt-2 text-slate-500">
                Configura el chip (NFCTap u otro) con esta URL. El huésped no necesita login.
              </p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        ) : null}

        <section className="mt-10">
          <h2 className="text-xl font-bold">Emergencias del huésped</h2>
          {emergencies.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Ningún aviso todavía.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {emergencies.map((e) => (
                <li key={e.id} className="rounded-lg border bg-white p-3 text-sm">
                  <div className="font-semibold">{e.space_name}</div>
                  <div className="text-slate-700">{e.guest_message}</div>
                  {e.guest_contact ? <div className="text-slate-500">Contacto: {e.guest_contact}</div> : null}
                  <div className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString('es-ES')}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
