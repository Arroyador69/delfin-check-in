'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AEATPage() {
  const today = new Date().toISOString().slice(0,10);
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const defaultFrom = firstOfMonth.toISOString().slice(0,10);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [property, setProperty] = useState('');
  const [channel, setChannel] = useState('');
  const [channelsCsv, setChannelsCsv] = useState('');
  const [roomsCsv, setRoomsCsv] = useState('');
  const [dateField, setDateField] = useState<'check_in'|'check_out'>('check_out');
  const [vat, setVat] = useState(21);
  const [preview, setPreview] = useState<{count:number;base:number;cuota_iva:number;total:number;comision_ota:number;totalsByChannel?:Record<string,any>}|null>(null);
  const router = useRouter();

  // La autenticación está manejada por el middleware

  const exportCsv = () => {
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    params.set('vat', String(vat));
    if (property) params.set('property', property);
    if (channel) params.set('channel', channel);
    if (channelsCsv) params.set('channels', channelsCsv);
    if (roomsCsv) params.set('rooms', roomsCsv);
    if (dateField) params.set('dateField', dateField);
    window.open(`/api/export/aeat?${params.toString()}`, '_blank');
  };

  const doPreview = async () => {
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    params.set('vat', String(vat));
    params.set('format', 'json');
    if (dateField) params.set('dateField', dateField);
    if (property) params.set('property', property);
    if (channel) params.set('channel', channel);
    if (channelsCsv) params.set('channels', channelsCsv);
    if (roomsCsv) params.set('rooms', roomsCsv);
    const res = await fetch(`/api/export/aeat?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    if (json && json.totals) setPreview({ ...json.totals, totalsByChannel: json.totalsByChannel, count: json.count });
  };

  const setMonth = (offset: number) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    const start = d.toISOString().slice(0,10);
    const endDate = new Date(d);
    endDate.setMonth(d.getMonth() + 1);
    endDate.setDate(0); // último día del mes
    const end = endDate.toISOString().slice(0,10);
    setFrom(start);
    setTo(end);
  };

  const setQuarter = (offsetQuarters: number) => {
    const d = new Date();
    const currentQuarter = Math.floor(d.getMonth() / 3);
    const q = currentQuarter + offsetQuarters;
    const startMonth = (Math.floor(q / 4) * 12) + ((q % 4 + 4) % 4) * 3; // normaliza
    const year = d.getFullYear() + Math.floor(startMonth / 12);
    const month = ((startMonth % 12) + 12) % 12;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 3, 0);
    setFrom(start.toISOString().slice(0,10));
    setTo(end.toISOString().slice(0,10));
  };

  // La autenticación se valida en middleware; no usamos estado de carga aquí


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
      {/* Header con emoji y gradiente */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 flex items-center gap-3">
          <span className="text-4xl sm:text-5xl md:text-6xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏛️</span>
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Exportar AEAT
          </span>
        </h1>
        <p className="text-gray-700 text-base sm:text-lg">
          Descarga CSV desde reservas (guest_paid, comisión OTA, neto). IVA por defecto 21%.
        </p>
      </div>

      {/* Filtros en una card */}
      <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 Desde
            </label>
            <input 
              type="date" 
              value={from} 
              onChange={e=>setFrom(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 Hasta
            </label>
            <input 
              type="date" 
              value={to} 
              onChange={e=>setTo(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🏠 Propiedad (room_id)
            </label>
            <input 
              type="text" 
              value={property} 
              onChange={e=>setProperty(e.target.value)} 
              placeholder="Opcional" 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🌐 Canal
            </label>
            <input 
              type="text" 
              value={channel} 
              onChange={e=>setChannel(e.target.value)} 
              placeholder="p.ej. airbnb, booking, manual" 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📋 Canales (CSV)
            </label>
            <input 
              type="text" 
              value={channelsCsv} 
              onChange={e=>setChannelsCsv(e.target.value)} 
              placeholder="airbnb,booking,manual" 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🛏️ Habitaciones (CSV)
            </label>
            <input 
              type="text" 
              value={roomsCsv} 
              onChange={e=>setRoomsCsv(e.target.value)} 
              placeholder="1,2,3" 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              💰 IVA %
            </label>
            <input 
              type="number" 
              value={vat} 
              onChange={e=>setVat(parseInt(e.target.value||'21',10))} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📆 Campo de fecha
            </label>
            <select 
              value={dateField} 
              onChange={e=>setDateField(e.target.value as any)} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
            >
              <option value="check_out">Por check-out</option>
              <option value="check_in">Por check-in</option>
            </select>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button 
          onClick={exportCsv} 
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
        >
          <span>💾</span>
          Descargar CSV
        </button>
        <button 
          onClick={doPreview} 
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
        >
          <span>👁️</span>
          Previsualizar totales
        </button>
        <button 
          onClick={() => setMonth(0)} 
          className="px-5 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:border-blue-500 hover:text-blue-600 font-semibold transition-all duration-200"
        >
          📅 Mes actual
        </button>
        <button 
          onClick={() => setMonth(-1)} 
          className="px-5 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:border-blue-500 hover:text-blue-600 font-semibold transition-all duration-200"
        >
          ⬅️ Mes anterior
        </button>
        <button 
          onClick={() => setQuarter(0)} 
          className="px-5 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:border-blue-500 hover:text-blue-600 font-semibold transition-all duration-200"
        >
          📊 Trimestre actual
        </button>
      </div>

      {/* Vista previa con estética mejorada */}
      {preview && (
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-6 mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📊</span>
            Vista Previa de Totales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
              <div className="text-sm text-gray-600 mb-1">📝 Registros</div>
              <div className="text-2xl font-bold text-gray-900">{preview.count}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
              <div className="text-sm text-gray-600 mb-1">💵 Base</div>
              <div className="text-2xl font-bold text-gray-900">{preview.base.toFixed(2)} €</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">🧾 Cuota IVA</div>
              <div className="text-2xl font-bold text-gray-900">{preview.cuota_iva.toFixed(2)} €</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-200">
              <div className="text-sm text-gray-600 mb-1">💰 Total</div>
              <div className="text-2xl font-bold text-gray-900">{preview.total.toFixed(2)} €</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-200">
              <div className="text-sm text-gray-600 mb-1">💸 Comisión OTA</div>
              <div className="text-2xl font-bold text-gray-900">{preview.comision_ota.toFixed(2)} €</div>
            </div>
          </div>
          {preview.totalsByChannel && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🌐</span>
                Desglose por Canal
              </h4>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <ul className="space-y-2">
                  {Object.entries(preview.totalsByChannel).map(([ch, t]: any) => (
                    <li key={ch} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                      <span className="font-medium text-gray-900">{ch || 'sin_canal'}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-600">Base: <strong className="text-gray-900">{Number(t.base).toFixed(2)} €</strong></span>
                        <span className="text-gray-600">Total: <strong className="text-gray-900">{Number(t.total).toFixed(2)} €</strong></span>
                        <span className="text-gray-600">Registros: <strong className="text-gray-900">({t.count})</strong></span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


