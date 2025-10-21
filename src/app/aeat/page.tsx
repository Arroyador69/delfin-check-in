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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header compacto */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <span className="text-3xl mr-3">🏛️</span>
              <h1 className="text-2xl font-bold text-gray-900">Exportar AEAT</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <p className="text-black mb-6">Descarga CSV desde reservas (guest_paid, comisión OTA, neto). IVA por defecto 21%.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm text-black mb-1">Desde</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded px-3 py-2 w-full text-black" />
        </div>
        <div>
          <label className="block text-sm text-black mb-1">Hasta</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-3 py-2 w-full text-black" />
        </div>
        <div>
          <label className="block text-sm text-black mb-1">Propiedad (room_id)</label>
          <input type="text" value={property} onChange={e=>setProperty(e.target.value)} placeholder="Opcional" className="border rounded px-3 py-2 w-full text-black placeholder-gray-500" />
        </div>
        <div>
          <label className="block text-sm text-black mb-1">Canal</label>
          <input type="text" value={channel} onChange={e=>setChannel(e.target.value)} placeholder="p.ej. airbnb, booking, manual" className="border rounded px-3 py-2 w-full text-black placeholder-gray-500" />
        </div>
        <div>
          <label className="block text-sm text-black mb-1">Canales (CSV)</label>
          <input type="text" value={channelsCsv} onChange={e=>setChannelsCsv(e.target.value)} placeholder="airbnb,booking,manual" className="border rounded px-3 py-2 w-full text-black placeholder-gray-500" />
        </div>
        <div>
          <label className="block text-sm text-black mb-1">Habitaciones (CSV)</label>
          <input type="text" value={roomsCsv} onChange={e=>setRoomsCsv(e.target.value)} placeholder="1,2,3" className="border rounded px-3 py-2 w-full text-black placeholder-gray-500" />
        </div>
        <div>
          <label className="block text-sm text-black mb-1">IVA %</label>
          <input type="number" value={vat} onChange={e=>setVat(parseInt(e.target.value||'21',10))} className="border rounded px-3 py-2 w-full text-black" />
        </div>
        <div>
          <label className="block text-sm text-black mb-1">Campo de fecha</label>
          <select value={dateField} onChange={e=>setDateField(e.target.value as any)} className="border rounded px-3 py-2 w-full text-black">
            <option value="check_out">Por check-out</option>
            <option value="check_in">Por check-in</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={exportCsv} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Descargar CSV</button>
        <button onClick={doPreview} className="px-3 py-2 bg-gray-100 text-black rounded hover:bg-gray-200">Previsualizar totales</button>
        <button onClick={() => setMonth(0)} className="px-3 py-2 bg-gray-100 text-black rounded hover:bg-gray-200">Mes actual</button>
        <button onClick={() => setMonth(-1)} className="px-3 py-2 bg-gray-100 text-black rounded hover:bg-gray-200">Mes anterior</button>
        <button onClick={() => setQuarter(0)} className="px-3 py-2 bg-gray-100 text-black rounded hover:bg-gray-200">Trimestre actual</button>
      </div>

      {preview && (
        <div className="mb-6 text-sm text-gray-700">
          <div className="mb-1"><span className="font-medium">Registros:</span> {preview.count}</div>
          <div><span className="font-medium">Base:</span> {preview.base.toFixed(2)} €</div>
          <div><span className="font-medium">Cuota IVA:</span> {preview.cuota_iva.toFixed(2)} €</div>
          <div><span className="font-medium">Total:</span> {preview.total.toFixed(2)} €</div>
          <div><span className="font-medium">Comisión OTA:</span> {preview.comision_ota.toFixed(2)} €</div>
          {preview.totalsByChannel && (
            <div className="mt-2">
              <div className="font-medium">Por canal:</div>
              <ul className="list-disc list-inside">
                {Object.entries(preview.totalsByChannel).map(([ch, t]: any) => (
                  <li key={ch} className="text-xs">{ch || 'sin_canal'} — base {Number(t.base).toFixed(2)} €, total {Number(t.total).toFixed(2)} € ({t.count})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* Delfín Check-in */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delfín Check-in</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Software de gestión hotelera y auto check-in para hostales y apartamentos.
              </p>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Contacto</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  contacto@delfincheckin.com
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Lun-Dom: 9:00-22:00
                </div>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Legal</h3>
              <div className="space-y-1">
                <a href="/legal/privacy" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Política de Privacidad
                </a>
                <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Política de Cookies
                </a>
                <a href="/legal/terms" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Términos de Servicio
                </a>
                <a href="/legal/notice" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Aviso Legal
                </a>
                <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Gestionar Cookies
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                © 2025 Delfín Check-in ·{' '}
                <a href="https://delfincheckin.com" className="text-blue-600 hover:text-blue-800 underline">
                  Ver precios
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
      
      );
      }


