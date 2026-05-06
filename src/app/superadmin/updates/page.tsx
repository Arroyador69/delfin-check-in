'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, Loader2, Send, RefreshCw } from 'lucide-react';

type UpdateRow = {
  id: string;
  created_by_email: string;
  title: string;
  body?: string | null;
  link?: string | null;
  created_at: string;
};

export default function SuperadminUpdatesPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('/settings');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/tenant-notifications/broadcast', { credentials: 'include' });
      const data = await res.json();
      if (data?.success && Array.isArray(data.updates)) setUpdates(data.updates);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const send = async () => {
    setSending(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/superadmin/tenant-notifications/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, link }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLastResult(data?.error || 'Error enviando actualización');
        return;
      }
      setLastResult(`Enviado a ${data.recipients ?? 0} tenants`);
      setTitle('');
      setBody('');
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-slate-700" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Actualizaciones</h1>
              <p className="text-sm text-slate-600">
                Envía una notificación a todos los tenants activos (campana).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
              title="Actualizar lista"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/superadmin" className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2">
              Volver
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Ej: Nueva mejora en calendarios"
              maxLength={120}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mensaje</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Describe la actualización (3-4000 caracteres)…"
              maxLength={4000}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Link (opcional)</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm"
              placeholder="/settings/support"
            />
            <p className="text-xs text-slate-500 mt-1">Debe empezar por <span className="font-mono">/</span> (ruta interna).</p>
          </div>

          <button
            type="button"
            onClick={send}
            disabled={sending || title.trim().length < 3 || body.trim().length < 3}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar a tenants
          </button>

          {lastResult ? <p className="text-sm text-slate-600">{lastResult}</p> : null}
        </div>

        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Histórico (últimas 25)</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : updates.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Aún no hay envíos.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {updates.map((u) => (
                <li key={u.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{u.title}</div>
                      {u.body ? <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{u.body}</div> : null}
                      <div className="text-xs text-slate-500 mt-2">
                        {new Date(u.created_at).toLocaleString()} · {u.created_by_email}
                        {u.link ? (
                          <>
                            {' '}· <span className="font-mono">{u.link}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

