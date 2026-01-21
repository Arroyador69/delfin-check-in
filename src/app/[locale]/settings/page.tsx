'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  
  // Estados para configuración de habitaciones/apartamentos
  const [roomsConfig, setRoomsConfig] = useState<Array<{id: number, name: string}>>([]);
  const [tenantLimits, setTenantLimits] = useState({ 
    maxRooms: 2, // Default para plan FREE
    maxReservations: 100, 
    maxGuests: 50 
  });
  const [tenantInfo, setTenantInfo] = useState({ 
    name: 'Mi Hostal',
    status: 'active' 
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar límites del tenant
        const limitsResponse = await fetch('/api/tenant/limits', {
          credentials: 'include' // Incluir cookies
        });
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
        // Fallback a configuración por defecto (2 habitaciones para plan FREE)
        setRoomsConfig([
          { id: 1, name: 'Habitación 1' },
          { id: 2, name: 'Habitación 2' }
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
                setMessage({ 
                  type: 'error', 
                  text: `⚠️ Límite alcanzado: Has usado todas las ${tenantLimits.maxRooms} habitaciones incluidas en tu plan actual. Para añadir más habitaciones, visita la página de Mejora de Plan.` 
                });
                setTimeout(() => setMessage({ type: '', text: '' }), 8000);
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
                  credentials: 'include', // Incluir cookies para que el middleware pueda extraer tenant_id
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
            📊 <strong>Límite de tu plan:</strong> Puedes configurar hasta {tenantLimits.maxRooms === -1 ? 'habitaciones ilimitadas' : `${tenantLimits.maxRooms} habitaciones/apartamentos`} según tu plan actual.
          </p>
          {/* Mostrar información de uso actual */}
          {roomsConfig.length > 0 && tenantLimits.maxRooms !== -1 && (
            <div className={`mt-3 p-3 rounded-lg border ${
              roomsConfig.length >= tenantLimits.maxRooms 
                ? 'bg-red-50 border-red-200' 
                : roomsConfig.length >= Math.floor(tenantLimits.maxRooms * 0.8)
                ? 'bg-orange-50 border-orange-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <p className={`text-xs font-medium ${
                roomsConfig.length >= tenantLimits.maxRooms 
                  ? 'text-red-800' 
                  : roomsConfig.length >= Math.floor(tenantLimits.maxRooms * 0.8)
                  ? 'text-orange-800'
                  : 'text-green-800'
              }`}>
                {roomsConfig.length >= tenantLimits.maxRooms ? (
                  <>
                    ⚠️ <strong>Límite alcanzado:</strong> Has configurado {roomsConfig.length}/{tenantLimits.maxRooms} habitaciones. 
                    Para añadir más, <a href="/upgrade-plan" className="underline font-bold">actualiza tu plan</a>.
                  </>
                ) : roomsConfig.length >= Math.floor(tenantLimits.maxRooms * 0.8) ? (
                  <>
                    ⚡ <strong>Cerca del límite:</strong> Has configurado {roomsConfig.length}/{tenantLimits.maxRooms} habitaciones ({Math.round((roomsConfig.length / tenantLimits.maxRooms) * 100)}% usado).
                    Te quedan {tenantLimits.maxRooms - roomsConfig.length} habitaciones disponibles.
                  </>
                ) : (
                  <>
                    ✅ <strong>Uso actual:</strong> {roomsConfig.length}/{tenantLimits.maxRooms} habitaciones configuradas ({Math.round((roomsConfig.length / tenantLimits.maxRooms) * 100)}% usado).
                    Puedes añadir hasta {tenantLimits.maxRooms - roomsConfig.length} habitaciones más.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

        </div>
      </div>
    </div>
  );
}