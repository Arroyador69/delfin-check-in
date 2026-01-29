'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Calendar, DollarSign, Save, Trash2 } from 'lucide-react';
import { roomSchema, RoomFormData } from '@/lib/validation';

// Tipo local para habitaciones
interface Room {
  id: string;
  name: string;
  ical_in_airbnb_url?: string;
  ical_in_booking_url?: string;
  base_price: number;
}

export default function RoomsPage() {
  const t = useTranslations('rooms');
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

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
      // TODO: Implementar con storage local
      setRooms([]);
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
      
      // TODO: Implementar con storage local
      console.log('Room data:', validatedData);
      
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
      alert(t('form.saveError'));
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
    if (!confirm(t('deleteConfirm'))) return;

    try {
      // TODO: Implementar con storage local
      console.log('Deleting room:', roomId);
      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      alert(t('form.deleteError'));
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
          <p className="mt-4 text-gray-600">{t('loading')}</p>
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
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-sm text-gray-600">{t('subtitle')}</p>
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
              {editingRoom ? t('editRoom') : t('newRoom')}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.roomName')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('form.roomNamePlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.airbnbUrl')}
                </label>
                <input
                  type="url"
                  value={formData.ical_in_airbnb_url}
                  onChange={(e) => setFormData({ ...formData, ical_in_airbnb_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('form.airbnbUrlPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.bookingUrl')}
                </label>
                <input
                  type="url"
                  value={formData.ical_in_booking_url}
                  onChange={(e) => setFormData({ ...formData, ical_in_booking_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('form.bookingUrlPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.basePrice')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('form.basePricePlaceholder')}
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingRoom ? t('update') : t('create')}
                </button>
                
                {editingRoom && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {t('form.cancel')}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de habitaciones */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t('yourRooms')}</h2>
            </div>
            
            <div className="p-6">
              {rooms.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {t('noRooms')}. {t('noRoomsDescription')}
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
                              {room.base_price}€{t('perNight')}
                            </div>
                            {room.ical_in_airbnb_url && (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {t('airbnb')}
                              </div>
                            )}
                            {room.ical_in_booking_url && (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {t('booking')}
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
          <h3 className="text-lg font-semibold text-blue-900 mb-4">{t('howToConfigureIcal')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">{t('airbnb')}</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. {t('airbnbStep1')}</li>
                <li>2. {t('airbnbStep2')}</li>
                <li>3. {t('airbnbStep3')}</li>
                <li>4. {t('airbnbStep4')}</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">{t('booking')}</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. {t('bookingStep1')}</li>
                <li>2. {t('bookingStep2')}</li>
                <li>3. {t('bookingStep3')}</li>
                <li>4. {t('bookingStep4')}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
