'use client';

import { useState } from 'react';
import { Copy, RefreshCw, Smartphone, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

export default function CalendarSyncPage() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const calendarUrl = 'https://admin.delfincheckin.com/api/ical/reservations';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header compacto */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">📅 Sincronización de Calendarios</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-lg p-6 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl">
          <div className="mb-6">
            <p className="text-gray-600">
              Mantén tus calendarios móviles actualizados con las reservas en tiempo real
            </p>
          </div>

          {/* URL de Calendario */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-6 h-6 mr-2" />
              URL del Calendario iCal
            </h2>
            
            <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="font-medium text-gray-900 mb-3 text-lg">📊 Todas las Reservas y Habitaciones</h3>
              <p className="text-sm text-gray-600 mb-4">
                Este calendario incluye toda la información de las habitaciones del dashboard
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={calendarUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-lg bg-white text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard(calendarUrl, 'calendar')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                >
                  {copiedUrl === 'calendar' ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span className="font-medium">Copiar URL</span>
                    </>
                  )}
                </button>
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
