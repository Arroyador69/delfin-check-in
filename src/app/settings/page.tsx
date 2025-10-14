'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  
  // Estados para identificación XML MIR
  const [mirData, setMirData] = useState({
    personalId: '',
    accommodationId: ''
  });

  // Estados para configuración de habitaciones/apartamentos
  const [roomsConfig, setRoomsConfig] = useState([
    { id: 1, name: 'Habitación 1' },
    { id: 2, name: 'Habitación 2' },
    { id: 3, name: 'Habitación 3' },
    { id: 4, name: 'Habitación 4' },
    { id: 5, name: 'Habitación 5' },
    { id: 6, name: 'Habitación 6' }
  ]);

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
        const savedPersonalId = localStorage.getItem('mir_personal_id') || '';
        const savedAccommodationId = localStorage.getItem('mir_accommodation_id') || '';
        const savedRoomsConfig = localStorage.getItem('rooms_config');
        
        setMirData(prev => ({
          ...prev,
          personalId: savedPersonalId,
          accommodationId: savedAccommodationId
        }));

        if (savedRoomsConfig) {
          setRoomsConfig(JSON.parse(savedRoomsConfig));
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };
    
    loadData();
  }, []);

  // Función para guardar datos MIR
  const handleMirDataChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!mirData.personalId.trim() || !mirData.accommodationId.trim()) {
        setMessage({ type: 'error', text: 'Ambos campos son obligatorios' });
        return;
      }

      // Guardar datos MIR en localStorage
      localStorage.setItem('mir_personal_id', mirData.personalId.trim());
      localStorage.setItem('mir_accommodation_id', mirData.accommodationId.trim());
      
      setMessage({ type: 'success', text: 'Datos de identificación MIR guardados exitosamente' });

    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar los datos MIR' });
    } finally {
      setLoading(false);
    }
  };

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

      {/* Identificación XML MIR */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">🔐 Identificación para XML MIR</h4>
        <p className="text-sm text-gray-600 mb-4">
          Configura tu número único personal y el de tu alojamiento del sistema de hospedaje del Ministerio del Interior para la exportación XML MIR.
        </p>
        <form onSubmit={handleMirDataChange} className="space-y-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Número Único Personal
              </label>
              <input
                type="text"
                value={mirData.personalId}
                onChange={(e) => setMirData(prev => ({ ...prev, personalId: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="123456789"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Tu número único del sistema de hospedaje del Ministerio del Interior
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Número Único del Alojamiento
              </label>
              <input
                type="text"
                value={mirData.accommodationId}
                onChange={(e) => setMirData(prev => ({ ...prev, accommodationId: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="987654321"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Número único de tu casa, hotel o alojamiento en el sistema MIR
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : 'Guardar Identificación MIR'}
          </button>
        </form>
      </div>

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
              const newId = Math.max(...roomsConfig.map(r => r.id), 0) + 1;
              setRoomsConfig([...roomsConfig, { id: newId, name: `Habitación ${newId}` }]);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Añadir Habitación</span>
          </button>
          <button
            onClick={() => {
              localStorage.setItem('rooms_config', JSON.stringify(roomsConfig));
              setMessage({ type: 'success', text: 'Configuración de habitaciones guardada exitosamente' });
              setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Guardar Configuración</span>
          </button>
        </div>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            💡 <strong>Nota:</strong> Los nombres que configures aquí aparecerán en todo el sistema: dashboard, creación de reservas, calendarios, etc.
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
    </div>
  );
}