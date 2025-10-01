'use client';

import { useEffect, useState } from 'react';

type Item = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  payload_hash: string;
  at: string;
  ip?: string;
  meta?: any;
};

export default function AuditPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (action) params.set('action', action);
    if (entityType) params.set('entityType', entityType);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('limit', '200');
    const res = await fetch(`/api/audit?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    setItems(json.items || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header compacto */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">🛡️ Bitácora de cumplimiento</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar (texto)" className="border rounded px-3 py-2" />
        <input value={action} onChange={e=>setAction(e.target.value)} placeholder="Acción (p.ej. VALIDATE_OK)" className="border rounded px-3 py-2" />
        <input value={entityType} onChange={e=>setEntityType(e.target.value)} placeholder="Tipo (PV_EXPORT/AEAT_EXPORT)" className="border rounded px-3 py-2" />
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded px-3 py-2" />
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-3 py-2" />
        <button onClick={fetchData} disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{loading ? 'Cargando...' : 'Filtrar'}</button>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entidad</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hash</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Meta</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-2 text-sm font-bold text-gray-800">{new Date(it.at).toLocaleString()}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{it.action}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{it.entity_type}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{it.entity_id}</td>
                <td className="px-4 py-2 text-xs text-gray-500 font-mono">{it.payload_hash}</td>
                <td className="px-4 py-2 text-xs text-gray-600">{it.meta ? JSON.stringify(it.meta) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}


