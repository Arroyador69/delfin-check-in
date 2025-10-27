'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  
  // Estados para configuración de habitaciones/apartamentos
  const [roomsConfig, setRoomsConfig] = useState<Array<{id: number, name: string}>>([]);
  const [tenantLimits, setTenantLimits] = useState({ 
    maxRooms: 6, 
    maxReservations: 100, 
    maxGuests: 50 
  });
  const [tenantInfo, setTenantInfo] = useState({ 
    name: 'Mi Hostal',
    status: 'active' 
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSaveSettings = async () => {
    setLoading(true);
    // Aquí iría la lógica para guardar configuraciones
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar límites del tenant
        const limitsResponse = await fetch('/api/tenant/limits');
        if (limitsResponse.ok) {
          const limitsData = await limitsResponse.json();
          if (limitsData.success) {
            setTenantLimits(limitsData.tenant.limits);
            setTenantInfo({
              name: limitsData.tenant.name,
              status: limitsData.tenant.status
            });
            setRoomsConfig(limitsData.currentRooms);
          }
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
        // Fallback a configuración por defecto
        setRoomsConfig([
          { id: 1, name: 'Habitación 1' },
          { id: 2, name: 'Habitación 2' },
          { id: 3, name: 'Habitación 3' },
          { id: 4, name: 'Habitación 4' },
          { id: 5, name: 'Habitación 5' },
          { id: 6, name: 'Habitación 6' }
        ]);
      }
    };
    
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      <div className="flex-1 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4">
            <span className="text-3xl sm:text-5xl mr-2 sm:mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>⚙️</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Configuración General</span>
          </h1>
          <p className="text-gray-600 text-sm sm:text-lg">Gestiona la configuración de tu cuenta</p>
        </div>
      
      {/* Mensaje de estado */}
      {message.text && (
        <div className={`p-4 rounded-xl flex items-center space-x-2 shadow-lg animate-fade-in ${
          message.type === 'success' 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200' 
            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border border-red-200'
        }`}>
          <span className={`w-5 h-5 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>🔔</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Configuración de Habitaciones/Apartamentos */}
      <div className="bg-white shadow-xl rounded-xl border border-blue-200 p-4 sm:p-8">
        <h4 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
          <span className="text-xl sm:text-2xl mr-2 sm:mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏨</span>
          Habitaciones/Apartamentos
        </h4>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
          Configura los nombres de tus habitaciones o apartamentos. Estos nombres aparecerán en el dashboard y al crear nuevas reservas.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {roomsConfig.map((room, index) => (
            <div key={room.id} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={room.name}
                  onChange={(e) => setRoomsConfig(prev => 
                    prev.map(r => r.id === room.id ? { ...r, name: e.target.value } : r)
                  )}
                  placeholder={`Habitación ${index + 1}`}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {roomsConfig.length > 1 && (
                <button
                  onClick={() => setRoomsConfig(prev => prev.filter(r => r.id !== room.id))}
                  className="flex-shrink-0 text-red-600 hover:text-red-800"
                  title="Eliminar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => {
              if (roomsConfig.length < tenantLimits.maxRooms) {
                const newId = Math.max(...roomsConfig.map(r => r.id), 0) + 1;
                setRoomsConfig([...roomsConfig, { id: newId, name: `Habitación ${newId}` }]);
              } else {
                setMessage({ type: 'error', text: `Has alcanzado el límite máximo de ${tenantLimits.maxRooms} habitaciones según tu plan` });
                setTimeout(() => setMessage({ type: '', text: '' }), 5000);
              }
            }}
            disabled={roomsConfig.length >= tenantLimits.maxRooms}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 text-sm sm:text-base"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Añadir</span>
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const response = await fetch('/api/tenant/rooms', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rooms: roomsConfig })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  setMessage({ type: 'success', text: 'Configuración de habitaciones guardada exitosamente' });
                } else {
                  setMessage({ type: 'error', text: data.message || 'Error guardando configuración' });
                }
              } catch (error) {
                setMessage({ type: 'error', text: 'Error de conexión' });
              } finally {
                setLoading(false);
                setTimeout(() => setMessage({ type: '', text: '' }), 5000);
              }
            }}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{loading ? 'Guardando...' : 'Guardar Configuración'}</span>
          </button>
        </div>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            💡 <strong>Nota:</strong> Los nombres que configures aquí aparecerán en todo el sistema: dashboard, creación de reservas, calendarios, etc.
          </p>
          <p className="text-xs text-blue-700 mt-1">
            📊 <strong>Límite contratado:</strong> Puedes configurar hasta {tenantLimits.maxRooms === -1 ? 'habitaciones ilimitadas' : `${tenantLimits.maxRooms} habitaciones/apartamentos`} según tu contrato con Delfín Check-in.
          </p>
          {tenantLimits.maxRooms < 6 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 mb-2">
                ⚠️ <strong>Problema detectado:</strong> Tu límite actual es de {tenantLimits.maxRooms} habitación(es), pero necesitas 6.
              </p>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const response = await fetch('/api/fix-tenant-6-rooms', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                      setMessage({ type: 'success', text: '¡Arreglado! Tu tenant ahora tiene 6 habitaciones. Recarga la página.' });
                      setTimeout(() => window.location.reload(), 3000);
                    } else {
                      setMessage({ type: 'error', text: data.message || 'Error arreglando tenant' });
                    }
                  } catch (error) {
                    setMessage({ type: 'error', text: 'Error de conexión' });
                  } finally {
                    setLoading(false);
                    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
                  }
                }}
                disabled={loading}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700 disabled:opacity-50"
              >
                {loading ? 'Arreglando...' : '🔧 Arreglar para 6 habitaciones'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Configuración general */}
      <div className="bg-white shadow-xl rounded-xl border border-blue-200 p-8">
        <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-2xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>⚙️</span>
          Configuración General
        </h4>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">
              Nombre de la Propiedad
            </label>
            <input
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mi Casa"
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">
              Zona Horaria
            </label>
            <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <option>Europe/Madrid</option>
              <option>UTC</option>
              <option>America/New_York</option>
            </select>
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">
              Idioma
            </label>
            <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <option>Español</option>
              <option>English</option>
            </select>
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">
              Moneda
            </label>
            <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <option>EUR (€)</option>
              <option>USD ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 shadow-lg w-full">
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
    </div>
  );
}