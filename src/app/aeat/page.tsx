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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  // Verificar autenticación
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Verificar si existe la cookie de autenticación
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(cookie => 
        cookie.trim().startsWith('auth_token=')
      );

      if (authCookie) {
        // Obtener la contraseña actual del localStorage
        const currentPassword = localStorage.getItem('admin_password') || 'Cuaderno2314';
        const token = authCookie.split('=')[1];
        
        if (token === currentPassword) {
          setIsAuthenticated(true);
        } else {
          // Token no coincide con la contraseña actual
          router.push('/admin-login');
          return;
        }
      } else {
        // Si no está autenticado, redirigir al login
        router.push('/admin-login');
        return;
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/admin-login');
      return;
    } finally {
      setAuthLoading(false);
    }
  };

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

  // Mostrar pantalla de autenticación si no está autenticado
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo y Título */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🐬</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Delfín Check-in</h1>
            <p className="text-gray-600">Panel de Administración</p>
          </div>

          {/* Mensaje de acceso requerido */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v4m0-4h4m-4 0H8m4-9V3m0 0h4m-4 0H8m4 6v6m0 0h4m-4 0H8" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Requerido</h2>
              <p className="text-gray-600 mb-6">
                Necesitas iniciar sesión para acceder a la exportación de AEAT.
              </p>
              <button
                onClick={() => router.push('/admin-login')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Iniciar Sesión
              </button>
            </div>
          </div>

          {/* Información de Seguridad */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              🔒 Acceso restringido solo para administradores autorizados
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header compacto */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Exportar AEAT</h1>
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
  );
}


