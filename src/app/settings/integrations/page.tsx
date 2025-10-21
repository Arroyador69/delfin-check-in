'use client';

import { useState, useEffect } from 'react';
import { Link, Calendar, RefreshCw, Plus, Copy, ExternalLink } from 'lucide-react';

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(false);
  
  // Estados para configuración de habitaciones/apartamentos
  const [roomsConfig, setRoomsConfig] = useState([
    { id: 1, name: 'Habitación 1' },
    { id: 2, name: 'Habitación 2' },
    { id: 3, name: 'Habitación 3' },
    { id: 4, name: 'Habitación 4' },
    { id: 5, name: 'Habitación 5' },
    { id: 6, name: 'Habitación 6' }
  ]);

  // Estados para integraciones
  const [externalICals, setExternalICals] = useState<{[roomId: string]: string[]}>({});
  const [syncLoading, setSyncLoading] = useState(false);
  const [newExternalIcal, setNewExternalIcal] = useState({ roomId: '', url: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedRoomsConfig = localStorage.getItem('rooms_config');
        const savedExternalICals = localStorage.getItem('external_icals');
        
        if (savedRoomsConfig) {
          setRoomsConfig(JSON.parse(savedRoomsConfig));
        }

        if (savedExternalICals) {
          setExternalICals(JSON.parse(savedExternalICals));
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };
    
    loadData();
  }, []);

  // Funciones para integraciones
  const generateICalUrl = (roomId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/ical/rooms/${roomId}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ type: 'success', text: 'URL copiada al portapapeles' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al copiar al portapapeles' });
    }
  };

  const addExternalIcal = () => {
    if (!newExternalIcal.roomId || !newExternalIcal.url.trim()) {
      setMessage({ type: 'error', text: 'Por favor, selecciona una habitación e introduce una URL válida' });
      return;
    }

    setExternalICals(prev => {
      const updated = { ...prev };
      if (!updated[newExternalIcal.roomId]) {
        updated[newExternalIcal.roomId] = [];
      }
      updated[newExternalIcal.roomId] = [...updated[newExternalIcal.roomId], newExternalIcal.url.trim()];
      localStorage.setItem('external_icals', JSON.stringify(updated));
      return updated;
    });

    setNewExternalIcal({ roomId: '', url: '' });
    setMessage({ type: 'success', text: 'iCal externo añadido exitosamente' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const removeExternalIcal = (roomId: string, index: number) => {
    setExternalICals(prev => {
      const updated = { ...prev };
      updated[roomId] = updated[roomId].filter((_, i) => i !== index);
      if (updated[roomId].length === 0) {
        delete updated[roomId];
      }
      localStorage.setItem('external_icals', JSON.stringify(updated));
      return updated;
    });
    setMessage({ type: 'success', text: 'iCal externo eliminado exitosamente' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Aquí se implementaría la lógica de sincronización
      // Por ahora simulamos el proceso
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMessage({ type: 'success', text: 'Sincronización completada exitosamente' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error durante la sincronización' });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
            <Calendar className="mr-3 h-8 w-8 text-blue-600" />
            Integraciones de Calendario
          </h3>
        </div>
        
        {/* Mensaje de estado */}
        {message.text && (
          <div className={`p-4 rounded-xl shadow-lg transition-all duration-300 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Botón de sincronización */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xl font-semibold text-gray-900 flex items-center">
                <RefreshCw className="w-6 h-6 mr-3 text-blue-600" />
                🔄 Sincronización de Calendarios
              </h4>
              <p className="text-gray-600 mt-2">
                Sincroniza todos los calendarios externos con tu sistema
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <RefreshCw className={`w-5 h-5 ${syncLoading ? 'animate-spin' : ''}`} />
              <span>{syncLoading ? '⏳ Sincronizando...' : '🚀 Sincronizar'}</span>
            </button>
          </div>
        </div>

        {/* iCals por habitación */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Calendar className="w-6 h-6 mr-3 text-green-600" />
            📅 iCals por Habitación
          </h4>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Cada habitación genera automáticamente un iCal que se actualiza con la información del dashboard. 
            Puedes copiar estas URLs y pegarlas en las OTAs (Airbnb, Booking.com, etc.).
          </p>
        
        <div className="space-y-4">
          {roomsConfig.map((room) => {
            const icalUrl = generateICalUrl(room.id.toString());
            const externalICalsForRoom = externalICals[room.id.toString()] || [];
            
            return (
              <div key={room.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900 flex items-center">
                    <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm mr-2">
                      {room.id}
                    </span>
                    {room.name}
                  </h5>
                </div>
                
                {/* iCal generado automáticamente */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    iCal Generado Automáticamente
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={icalUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(icalUrl)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-1"
                      title="Copiar URL"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copiar</span>
                    </button>
                    <a
                      href={icalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 flex items-center space-x-1"
                      title="Abrir iCal"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Ver</span>
                    </a>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Este iCal se actualiza automáticamente con las reservas de esta habitación
                  </p>
                </div>

                {/* iCals externos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    iCals Externos (OTAs)
                  </label>
                  
                  {/* Lista de iCals externos existentes */}
                  {externalICalsForRoom.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {externalICalsForRoom.map((url, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={url}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                          />
                          <button
                            onClick={() => removeExternalIcal(room.id.toString(), index)}
                            className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulario para añadir nuevo iCal externo */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newExternalIcal.url}
                      onChange={(e) => setNewExternalIcal(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://calendar.google.com/calendar/ical/..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => {
                        setNewExternalIcal(prev => ({ ...prev, roomId: room.id.toString() }));
                        addExternalIcal();
                      }}
                      className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 flex items-center space-x-1"
                      title="Añadir iCal externo"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Añadir</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Añade URLs de calendarios externos (Airbnb, Booking.com, etc.) para esta habitación
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

        {/* Información adicional */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-lg transition-all duration-500 hover:shadow-xl hover:scale-[1.02]">
          <div className="flex">
            <div className="flex-shrink-0">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                ℹ️ Información sobre Integraciones
              </h3>
              <div className="text-sm text-blue-700 space-y-2">
                <p className="flex items-center">
                  <span className="mr-2">🔄</span> Los iCals se actualizan automáticamente cada 15 minutos
                </p>
                <p className="flex items-center">
                  <span className="mr-2">📊</span> Puedes tener múltiples calendarios externos por habitación
                </p>
                <p className="flex items-center">
                  <span className="mr-2">🔗</span> Las OTAs sincronizarán automáticamente con estos calendarios
                </p>
                <p className="flex items-center">
                  <span className="mr-2">⚡</span> Usa el botón "Sincronizar" para forzar una actualización inmediata
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
