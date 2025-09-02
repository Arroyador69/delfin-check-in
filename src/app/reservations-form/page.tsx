'use client';

import { useState } from 'react';
import { Plus, X, Calendar, User, Bed, Euro, CreditCard, CheckCircle } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  base_price: number;
}

interface ReservationFormData {
  room_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  total_price: string;
  guest_paid: string;
  platform_commission: string;
  currency: string;
  status: string;
  channel: string;
}

export default function ReservationsFormPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ReservationFormData>({
    room_id: '',
    guest_name: '',
    guest_email: '',
    check_in: '',
    check_out: '',
    total_price: '',
    guest_paid: '',
    platform_commission: '',
    currency: 'EUR',
    status: 'confirmed',
    channel: 'manual',
  });

  // Cargar habitaciones al montar el componente
  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      if (response.ok) {
        const data = await response.json();
        setRooms(data || []);
      }
    } catch (error) {
      console.error('Error cargando habitaciones:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.room_id || !formData.guest_name || !formData.check_in || !formData.check_out) {
      setError('Por favor, completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Crear la reserva
      const reservationResponse = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          total_price: parseFloat(formData.total_price) || 0,
          guest_paid: parseFloat(formData.guest_paid) || parseFloat(formData.total_price) || 0,
          platform_commission: parseFloat(formData.platform_commission) || 0,
        }),
      });

      if (!reservationResponse.ok) {
        const errorData = await reservationResponse.json();
        throw new Error(errorData.error || 'Error al crear la reserva');
      }

      const newReservation = await reservationResponse.json();

      // Ahora crear el registro de viajero para el Ministerio del Interior
      const guestRegistrationData = {
        reservation_id: newReservation.id,
        name: formData.guest_name.split(' ')[0] || formData.guest_name,
        surname: formData.guest_name.split(' ').slice(1).join(' ') || '',
        birth_date: '', // Campo requerido por el Ministerio
        birth_place: '',
        nationality: 'ESP', // Por defecto español
        document_type: 'dni' as const,
        document_number: '',
        document_issuing_country: 'ESP',
        document_expiry_date: '',
        email: formData.guest_email,
        phone: '',
        address: '',
        city: '',
        postal_code: '',
        country: 'ESP',
        arrival_date: formData.check_in,
        departure_date: formData.check_out,
        room_number: rooms.find(r => r.id === formData.room_id)?.name || formData.room_id,
        travel_purpose: 'tourism' as const,
        accepts_terms: true,
        accepts_data_processing: true,
        sent_to_spain_ministry: false,
      };

      // Guardar el registro de viajero
      const guestResponse = await fetch('/api/guest-registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guestRegistrationData),
      });

      if (!guestResponse.ok) {
        console.warn('Advertencia: No se pudo guardar el registro de viajero');
      }

      // Mostrar mensaje de éxito
      setShowSuccess(true);
      resetForm();
      
      // Redirigir al dashboard de registros después de 3 segundos
      setTimeout(() => {
        window.open('/guest-registrations-dashboard', '_blank');
      }, 3000);

    } catch (error: any) {
      console.error('Error creating reservation:', error);
      setError(`Error al crear la reserva: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      room_id: '',
      guest_name: '',
      guest_email: '',
      check_in: '',
      check_out: '',
      total_price: '',
      guest_paid: '',
      platform_commission: '',
      currency: 'EUR',
      status: 'confirmed',
      channel: 'manual',
    });
  };

  const handleInputChange = (field: keyof ReservationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null); // Limpiar errores al escribir
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ¡Reserva Creada Exitosamente!
          </h3>
          <p className="text-gray-600 mb-6">
            La reserva se ha guardado y se abrirá automáticamente tu dashboard de registros para generar el XML del Ministerio del Interior.
          </p>
          <div className="text-sm text-gray-500">
            <p>Redirigiendo en unos segundos...</p>
            <p className="mt-2">
              <a 
                href="/guest-registrations-dashboard" 
                target="_blank"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Abrir dashboard ahora
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simple sin menú */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">🐬</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delfín Check-in</h1>
                <p className="text-sm text-gray-600">Sistema de Reservas</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Formulario de Reserva
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título principal */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Nueva Reserva
          </h2>
          <p className="text-lg text-gray-600">
            Completa los datos de la reserva. Se guardará automáticamente y podrás generar el XML para el Ministerio del Interior.
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información de la habitación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Bed className="h-4 w-4 inline mr-2" />
                  Habitación *
                </label>
                <select
                  required
                  value={formData.room_id}
                  onChange={(e) => handleInputChange('room_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar habitación</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name} - €{room.base_price}/noche
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Estado *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>

            {/* Información del huésped */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Nombre del huésped *
                </label>
                <input
                  type="text"
                  required
                  value={formData.guest_name}
                  onChange={(e) => handleInputChange('guest_name', e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Email del huésped
                </label>
                <input
                  type="email"
                  value={formData.guest_email}
                  onChange={(e) => handleInputChange('guest_email', e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Fecha de llegada *
                </label>
                <input
                  type="date"
                  required
                  value={formData.check_in}
                  onChange={(e) => handleInputChange('check_in', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Fecha de salida *
                </label>
                <input
                  type="date"
                  required
                  value={formData.check_out}
                  onChange={(e) => handleInputChange('check_out', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Información financiera */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Euro className="h-4 w-4 inline mr-2" />
                  Precio total
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_price}
                  onChange={(e) => handleInputChange('total_price', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CreditCard className="h-4 w-4 inline mr-2" />
                  Pagó huésped
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.guest_paid}
                  onChange={(e) => handleInputChange('guest_paid', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Euro className="h-4 w-4 inline mr-2" />
                  Comisión plataforma
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.platform_commission}
                  onChange={(e) => handleInputChange('platform_commission', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Moneda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Euro className="h-4 w-4 inline mr-2" />
                Moneda
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Dólar)</option>
                <option value="GBP">GBP (Libra)</option>
              </select>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de envío */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center text-lg font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Creando Reserva...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-3" />
                    Crear Reserva y Generar XML
                  </>
                )}
              </button>
            </div>

            {/* Información adicional */}
            <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-200">
              <p>
                Al crear la reserva, se abrirá automáticamente tu dashboard de registros 
                para generar el XML requerido por el Ministerio del Interior de España.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
