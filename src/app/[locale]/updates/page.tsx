'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Link } from '@/i18n/navigation';

type UpdateRow = {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  created_at?: string;
};

export default function TenantUpdatesPage() {
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/tenant/updates', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (mounted && Array.isArray(data?.updates)) {
          setUpdates(data.updates as UpdateRow[]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Actualizaciones</h1>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Volver
          </Link>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-600">Cargando…</div>
        ) : updates.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-600">
            No hay actualizaciones todavía.
          </div>
        ) : (
          <div className="space-y-3">
            {updates.map((u: any) => (
              <div key={String(u.id)} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-sm text-gray-500">
                  {u.created_at ? new Date(u.created_at).toLocaleString() : ''}
                </div>
                <div className="mt-1 text-lg font-bold text-gray-900">{String(u.title || '')}</div>
                {u.body ? <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{String(u.body)}</div> : null}
                {u.link && String(u.link).startsWith('/') ? (
                  <div className="mt-3">
                    <Link href={String(u.link) as any} className="text-sm text-blue-600 hover:underline">
                      Ver más
                    </Link>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

