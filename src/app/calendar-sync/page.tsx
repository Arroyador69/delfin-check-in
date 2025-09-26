'use client';

import { useState } from 'react';
import { Copy, RefreshCw, Smartphone, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

export default function CalendarSyncPage() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const calendarUrls = {
    all: 'https://admin.delfincheckin.com/api/ical/reservations',
    room1: 'https://admin.delfincheckin.com/api/ical/rooms/room-001',
    room2: 'https://admin.delfincheckin.com/api/ical/rooms/room-002',
    room3: 'https://admin.delfincheckin.com/api/ical/rooms/room-003',
    room4: 'https://admin.delfincheckin.com/api/ical/rooms/room-004',
  };

  const copyToClipboard = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(label);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header compacto */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">📅 Sincronización de Calendarios</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <p className="text-gray-600">
              Mantén tus calendarios móviles actualizados con las reservas en tiempo real
            </p>
          </div>

          {/* URLs de Calendarios */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-6 h-6 mr-2" />
              URLs de Calendarios iCal
            </h2>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">📊 Todas las Reservas</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={calendarUrls.all}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(calendarUrls.all, 'all')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
                  >
                    {copiedUrl === 'all' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copiedUrl === 'all' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">🏨 Por Habitaciones</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(calendarUrls).filter(([key]) => key.startsWith('room')).map(([key, url]) => {
                    const roomNumber = key.replace('room', '');
                    return (
                      <div key={key} className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-gray-800 w-24">Habitación {roomNumber}:</span>
                        <input
                          type="text"
                          value={url}
                          readOnly
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs bg-gray-50"
                        />
                        <button
                          onClick={() => copyToClipboard(url, key)}
                          className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                        >
                          {copiedUrl === key ? '✓' : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Instrucciones por dispositivo */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Smartphone className="w-6 h-6 mr-2" />
              Cómo Añadir a tu Calendario
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* iPhone/iOS */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📱 iPhone/iPad</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Abre la app <strong>Ajustes</strong></li>
                  <li>Ve a <strong>Calendario</strong> → <strong>Cuentas</strong></li>
                  <li>Toca <strong>Añadir cuenta</strong> → <strong>Otro</strong></li>
                  <li>Selecciona <strong>Añadir calendario suscrito</strong></li>
                  <li>Pega la URL del calendario que copiaste arriba</li>
                  <li>Toca <strong>Siguiente</strong> y <strong>Guardar</strong></li>
                </ol>
              </div>

              {/* Android/Google */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🤖 Android/Google Calendar</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Abre <strong>Google Calendar</strong> en el navegador</li>
                  <li>En el lado izquierdo, busca <strong>"Otros calendarios"</strong></li>
                  <li>Haz clic en <strong>+</strong> → <strong>Desde URL</strong></li>
                  <li>Pega la URL del calendario</li>
                  <li>Haz clic en <strong>Añadir calendario</strong></li>
                  <li>El calendario aparecerá en tu app móvil automáticamente</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Problemas de Sincronización */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <RefreshCw className="w-6 h-6 mr-2" />
              ¿No se Actualizan las Reservas?
            </h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-yellow-600 mt-1 mr-3" />
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-2">Problema Común</h3>
                  <p className="text-yellow-700 mb-4">
                    Los calendarios móviles pueden tardar entre <strong>15 minutos y 24 horas</strong> en 
                    sincronizar automáticamente. Esto es normal y depende del dispositivo y la aplicación.
                  </p>
                  
                  <h4 className="font-semibold text-yellow-800 mb-2">Soluciones:</h4>
                  <ul className="list-disc list-inside space-y-1 text-yellow-700">
                    <li><strong>Fuerza la sincronización:</strong> Arrastra hacia abajo en tu app de calendario</li>
                    <li><strong>Elimina y vuelve a añadir:</strong> Borra el calendario suscrito y añádelo de nuevo</li>
                    <li><strong>Usa la URL actualizada:</strong> Las URLs incluyen timestamps para forzar actualizaciones</li>
                    <li><strong>Verifica la conexión:</strong> Asegúrate de tener internet activo</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Información Técnica */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Información Técnica</h3>
            <ul className="list-disc list-inside space-y-1 text-blue-700 text-sm">
              <li>Los calendarios se actualizan automáticamente cada vez que hay cambios</li>
              <li>Incluyen información completa: huésped, teléfono, precio, comisiones</li>
              <li>Configurados para sincronizar cada 15 minutos (PT15M)</li>
              <li>Compatible con todos los calendarios que soporten iCal/CalDAV</li>
              <li>Zona horaria: Europa/Madrid (CET/CEST)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
