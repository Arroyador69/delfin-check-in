'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';

type SentryIssueRow = {
  id: string;
  title: string;
  shortId: string | null;
  count: string;
  userCount: number;
  lastSeen: string;
  firstSeen: string;
  permalink: string | null;
  status: string;
  level: string | null;
  culprit: string | null;
};

type ApiResponse = {
  success?: boolean;
  configured?: boolean;
  message?: string;
  error?: string;
  issues: SentryIssueRow[];
  org?: string;
  project?: string;
};

export default function SuperadminLogsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/sentry-issues?limit=50', {
        credentials: 'include',
      });
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch (e) {
      setData({
        success: false,
        error: (e as Error).message,
        issues: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/superadmin"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← SuperAdmin
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl" aria-hidden>
              🚨
            </span>
            Logs & errores (Sentry)
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Incidencias sin resolver recientes del proyecto en Sentry. Solo visible para superadmin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {loading && !data && (
        <div className="text-center py-16 text-gray-600">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-3 text-blue-600" />
          Cargando desde Sentry…
        </div>
      )}

      {data && data.configured === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold">Sentry no está enlazado en el servidor</p>
              <p className="text-sm mt-2 leading-relaxed">
                Añade en Vercel (Variables de entorno) los secretos:{' '}
                <code className="bg-amber-100/80 px-1 rounded">SENTRY_AUTH_TOKEN</code>,{' '}
                <code className="bg-amber-100/80 px-1 rounded">SENTRY_ORG_SLUG</code>,{' '}
                <code className="bg-amber-100/80 px-1 rounded">SENTRY_PROJECT_SLUG</code>.
                El token debe ser de una integración interna con permisos de lectura de eventos. Si tu
                organización está en la UE, define también{' '}
                <code className="bg-amber-100/80 px-1 rounded">SENTRY_API_BASE=https://de.sentry.io/api/0</code>.
              </p>
              <p className="text-sm mt-3">
                Los errores del cliente ya se envían con <code className="bg-amber-100/80 px-1 rounded">NEXT_PUBLIC_SENTRY_DSN</code>
                ; esta pantalla solo los lista vía API.
              </p>
            </div>
          </div>
        </div>
      )}

      {data && data.error && data.configured !== false && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 text-sm mb-6">
          {data.error}
        </div>
      )}

      {data && data.configured && data.issues && data.issues.length === 0 && !data.error && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center text-green-900">
          <p className="font-medium">No hay issues sin resolver en el periodo (o Sentry devolvió lista vacía).</p>
          {data.org && data.project && (
            <p className="text-sm mt-2 text-green-800">
              Proyecto: {data.org} / {data.project}
            </p>
          )}
        </div>
      )}

      {data && data.issues && data.issues.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-3 font-semibold text-gray-700">Issue</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 hidden md:table-cell">
                  Origen
                </th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700">Nivel</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-700">Eventos</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-700 hidden lg:table-cell">
                  Última vez
                </th>
                <th className="text-right py-3 px-3 font-semibold text-gray-700">Sentry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50/80">
                  <td className="py-3 px-3 align-top">
                    <div className="font-medium text-gray-900 max-w-md">{issue.title}</div>
                    {issue.shortId && (
                      <div className="text-xs text-gray-500 mt-0.5">{issue.shortId}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 align-top text-gray-600 hidden md:table-cell max-w-xs truncate">
                    {issue.culprit || '—'}
                  </td>
                  <td className="py-3 px-3 align-top">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        issue.level === 'error' || issue.level === 'fatal'
                          ? 'bg-red-100 text-red-800'
                          : issue.level === 'warning'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {issue.level || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 align-top text-right tabular-nums">{issue.count}</td>
                  <td className="py-3 px-3 align-top text-gray-600 hidden lg:table-cell whitespace-nowrap">
                    {formatDate(issue.lastSeen)}
                  </td>
                  <td className="py-3 px-3 align-top text-right">
                    {issue.permalink ? (
                      <a
                        href={issue.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Abrir
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.configured && data.org && (
        <p className="text-xs text-gray-500 mt-6">
          Origen API: organización <strong>{data.org}</strong>, proyecto <strong>{data.project}</strong>. Consulta
          filtro <code className="bg-gray-100 px-1 rounded">is:unresolved</code> últimos 14 días.
        </p>
      )}
    </div>
  );
}
