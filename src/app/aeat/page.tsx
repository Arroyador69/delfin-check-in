'use client';

import { useState } from 'react';

export default function AEATPage() {
  const today = new Date().toISOString().slice(0,10);
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const defaultFrom = firstOfMonth.toISOString().slice(0,10);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [property, setProperty] = useState('');
  const [vat, setVat] = useState(21);

  const exportCsv = () => {
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    params.set('vat', String(vat));
    if (property) params.set('property', property);
    window.open(`/api/export/aeat?${params.toString()}`, '_blank');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Exportar AEAT</h1>
      <p className="text-gray-600 mb-6">Descarga CSV desde reservas (guest_paid, comisión OTA, neto). IVA por defecto 21%.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Desde</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Hasta</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Propiedad (room_id)</label>
          <input type="text" value={property} onChange={e=>setProperty(e.target.value)} placeholder="Opcional" className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">IVA %</label>
          <input type="number" value={vat} onChange={e=>setVat(parseInt(e.target.value||'21',10))} className="border rounded px-3 py-2 w-full" />
        </div>
      </div>

      <button onClick={exportCsv} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Descargar CSV</button>
    </div>
  );
}


