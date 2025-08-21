'use client';

import { useState, useEffect } from 'react';
import { Home, Calendar, DollarSign, Save, Plus, Trash2 } from 'lucide-react';
import { Room } from '@/lib/supabase';
import { roomSchema, RoomFormData } from '@/lib/validation';
import { supabase } from '@/lib/supabase';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    ical_in_airbnb_url: '',
    ical_in_booking_url: '',
    base_price: 0,
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name');

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = roomSchema.parse(formData);
      
      if (editingRoom) {
        // Actualizar habitación existente
        const { error } = await supabase
          .from('rooms')
          .update(validatedData)
          .eq('id', editingRoom.id);

        if (error) throw error;
      } else {
        // Crear nueva habitación
        const { error } = await supabase
          .from('rooms')
          .insert(validatedData);

        if (error) throw error;
      }

      // Limpiar formulario y recargar datos
      setFormData({
        name: '',
        ical_in_airbnb_url: '',
        ical_in_booking_url: '',
        base_price: 0,
      });
      setEditingRoom(null);
      fetchRooms();
    } catch (error) {
      console.error('Error saving room:', error);
      alert('Error al guardar la habitación');
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      ical_in_airbnb_url: room.ical_in_airbnb_url || '',
      ical_in_booking_url: room.ical_in_booking_url || '',
      base_price: room.base_price,
    });
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta habitación?')) return;

    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;
      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Error al eliminar la habitación');
    }
  };

  const handleCancel = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      ical_in_airbnb_url: '',
      ical_in_booking_url: '',
      base_price: 0,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando habitaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Home className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestionar Habitaciones</h1>
                <p className="text-sm text-gray-600">Configura tus habitaciones y sincronización iCal</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {editingRoom ? 'Editar Habitación' : 'Nueva Habitación'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Habitación
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Habitación 1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL iCal de Airbnb
                </label>
                <input
                  type="url"
                  value={formData.ical_in_airbnb_url}
                  onChange={(e) => setFormData({ ...formData, ical_in_airbnb_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://calendar.google.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL iCal de Booking
                </label>
                <input
                  type="url"
                  value={formData.ical_in_booking_url}
                  onChange={(e) => setFormData({ ...formData, ical_in_booking_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://calendar.google.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio Base (€/noche)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="80.00"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingRoom ? 'Actualizar' : 'Crear'}
                </button>
                
                {editingRoom && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de habitaciones */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Tus Habitaciones</h2>
            </div>
            
            <div className="p-6">
              {rooms.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay habitaciones configuradas. Crea tu primera habitación.
                </p>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <div key={room.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{room.name}</h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1" />
                              {room.base_price}€/noche
                            </div>
                            {room.ical_in_airbnb_url && (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Airbnb
                              </div>
                            )}
                            {room.ical_in_booking_url && (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Booking
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(room)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(room.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Información de ayuda */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">¿Cómo configurar iCal?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Airbnb</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Ve a tu panel de Airbnb</li>
                <li>2. Selecciona la propiedad</li>
                <li>3. Ve a "Calendario" → "Configuración"</li>
                <li>4. Copia la URL de "Exportar calendario"</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Booking</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Accede a tu panel de Booking</li>
                <li>2. Ve a "Calendario"</li>
                <li>3. Haz clic en "Exportar calendario"</li>
                <li>4. Copia la URL del calendario</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
