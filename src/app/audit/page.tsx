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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar (texto)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input value={action} onChange={e=>setAction(e.target.value)} placeholder="Acción (p.ej. VALIDATE_OK)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input value={entityType} onChange={e=>setEntityType(e.target.value)} placeholder="Tipo (PV_EXPORT/AEAT_EXPORT)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <button onClick={fetchData} disabled={loading} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg font-medium">{loading ? 'Cargando...' : 'Filtrar'}</button>
      </div>

      {/* Contenedor con scroll independiente */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Cabecera fija */}
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Bitácora de Cumplimiento</h2>
          <p className="text-sm text-gray-600 mt-1">{items.length} registros encontrados</p>
        </div>

        {/* Tabla con scroll vertical y horizontal independiente */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hash</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meta</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{new Date(it.at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{it.action}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{it.entity_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{it.entity_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono max-w-xs truncate" title={it.payload_hash}>{it.payload_hash}</td>
                    <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate" title={it.meta ? JSON.stringify(it.meta) : '-'}>{it.meta ? JSON.stringify(it.meta) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>


    </div>
  );
}


