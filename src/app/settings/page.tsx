'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  
  // Estados para configuración de habitaciones/apartamentos
  const [roomsConfig, setRoomsConfig] = useState<Array<{id: number, name: string}>>([]);
  const [tenantLimits, setTenantLimits] = useState({ maxRooms: 6 });
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
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Configuración General</h3>
      
      {/* Mensaje de estado */}
      {message.text && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Configuración de Habitaciones/Apartamentos */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">🏨 Habitaciones/Apartamentos</h4>
        <p className="text-sm text-gray-600 mb-4">
          Configura los nombres de tus habitaciones o apartamentos. Estos nombres aparecerán en el dashboard y al crear nuevas reservas.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="mt-4 flex space-x-3">
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
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
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
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
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
            📊 <strong>Límite de tu plan:</strong> Puedes configurar hasta {tenantLimits.maxRooms} habitaciones/apartamentos.
          </p>
        </div>
      </div>

      {/* Configuración general */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">⚙️ Configuración General</h4>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre de la Propiedad
            </label>
            <input
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mi Casa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Zona Horaria
            </label>
            <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <option>Europe/Madrid</option>
              <option>UTC</option>
              <option>America/New_York</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Idioma
            </label>
            <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <option>Español</option>
              <option>English</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
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
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </button>
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
    </div>
  );
}