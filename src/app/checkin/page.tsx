'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, FileText, Download, Send } from 'lucide-react';
import { Guest, guestsSchema, GuestsFormData } from '@/lib/validation';
import { supabase } from '@/lib/supabase';

export default function CheckinPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [guests, setGuests] = useState<Guest[]>([{
    name: '',
    document_type: 'dni',
    document_number: '',
    birth_date: '',
    country: '',
    accepts_rules: false,
  }]);
  const [arrivalTime, setArrivalTime] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [signatures, setSignatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          rooms(name)
        `)
        .eq('status', 'confirmed')
        .gte('check_in', new Date().toISOString())
        .order('check_in');

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  const addGuest = () => {
    setGuests([...guests, {
      name: '',
      document_type: 'dni',
      document_number: '',
      birth_date: '',
      country: '',
      accepts_rules: false,
    }]);
    setSignatures([...signatures, '']);
  };

  const removeGuest = (index: number) => {
    if (guests.length > 1) {
      setGuests(guests.filter((_, i) => i !== index));
      setSignatures(signatures.filter((_, i) => i !== index));
    }
  };

  const updateGuest = (index: number, field: keyof Guest, value: any) => {
    const updatedGuests = [...guests];
    updatedGuests[index] = { ...updatedGuests[index], [field]: value };
    setGuests(updatedGuests);
  };

  const startDrawing = (index: number, e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRefs.current[index];
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Guardar firma como base64
      const signatureData = canvas.toDataURL();
      const updatedSignatures = [...signatures];
      updatedSignatures[index] = signatureData;
      setSignatures(updatedSignatures);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const clearSignature = (index: number) => {
    const canvas = canvasRefs.current[index];
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const updatedSignatures = [...signatures];
    updatedSignatures[index] = '';
    setSignatures(updatedSignatures);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReservation) {
      alert('Por favor selecciona una reserva');
      return;
    }

    // Validar que todos los huéspedes han firmado
    if (signatures.some(sig => !sig)) {
      alert('Todos los huéspedes deben firmar el formulario');
      return;
    }

    setLoading(true);

    try {
      // Guardar datos de huéspedes
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        const signature = signatures[i];

        const { error } = await supabase
          .from('guests')
          .insert({
            reservation_id: selectedReservation.id,
            name: guest.name,
            document_type: guest.document_type,
            document_number: guest.document_number,
            birth_date: guest.birth_date,
            country: guest.country,
            signature_url: signature,
            accepts_rules: guest.accepts_rules,
          });

        if (error) throw error;
      }

      // Generar PDF y enviar notificaciones
      // TODO: Implementar generación de PDF y notificaciones

      alert('Check-in completado exitosamente');
      
      // Limpiar formulario
      setGuests([{
        name: '',
        document_type: 'dni',
        document_number: '',
        birth_date: '',
        country: '',
        accepts_rules: false,
      }]);
      setSignatures(['']);
      setArrivalTime('');
      setSpecialRequests('');
      setSelectedReservation(null);
      
      fetchReservations();
    } catch (error) {
      console.error('Error completing check-in:', error);
      alert('Error al completar el check-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Check-in Digital</h1>
                <p className="text-sm text-gray-600">Formularios para huéspedes</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de reservas */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Reservas Pendientes</h2>
              </div>
              
              <div className="p-6">
                {reservations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No hay reservas pendientes de check-in.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        onClick={() => setSelectedReservation(reservation)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedReservation?.id === reservation.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <h3 className="font-semibold text-gray-900">
                          {reservation.rooms?.name}
                        </h3>
                        <p className="text-sm text-gray-600">{reservation.guest_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(reservation.check_in).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Formulario de check-in */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedReservation ? `Check-in - ${selectedReservation.rooms?.name}` : 'Selecciona una reserva'}
                </h2>
              </div>
              
              <div className="p-6">
                {!selectedReservation ? (
                  <p className="text-gray-500 text-center py-8">
                    Selecciona una reserva de la lista para comenzar el check-in.
                  </p>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información de la reserva */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Detalles de la Reserva</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Huésped:</span>
                          <p className="font-medium">{selectedReservation.guest_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Check-in:</span>
                          <p className="font-medium">
                            {new Date(selectedReservation.check_in).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Check-out:</span>
                          <p className="font-medium">
                            {new Date(selectedReservation.check_out).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Canal:</span>
                          <p className="font-medium capitalize">{selectedReservation.channel}</p>
                        </div>
                      </div>
                    </div>

                    {/* Hora de llegada */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora de Llegada Aproximada
                      </label>
                      <input
                        type="time"
                        value={arrivalTime}
                        onChange={(e) => setArrivalTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Huéspedes */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Huéspedes</h3>
                        <button
                          type="button"
                          onClick={addGuest}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          + Agregar
                        </button>
                      </div>
                      
                      <div className="space-y-6">
                        {guests.map((guest, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium text-gray-900">Huésped {index + 1}</h4>
                              {guests.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeGuest(index)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Eliminar
                                </button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Nombre Completo
                                </label>
                                <input
                                  type="text"
                                  value={guest.name}
                                  onChange={(e) => updateGuest(index, 'name', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  required
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Tipo de Documento
                                </label>
                                <select
                                  value={guest.document_type}
                                  onChange={(e) => updateGuest(index, 'document_type', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  required
                                >
                                  <option value="dni">DNI</option>
                                  <option value="passport">Pasaporte</option>
                                  <option value="nie">NIE</option>
                                  <option value="other">Otro</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Número de Documento
                                </label>
                                <input
                                  type="text"
                                  value={guest.document_number}
                                  onChange={(e) => updateGuest(index, 'document_number', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  required
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Fecha de Nacimiento
                                </label>
                                <input
                                  type="date"
                                  value={guest.birth_date}
                                  onChange={(e) => updateGuest(index, 'birth_date', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  required
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  País
                                </label>
                                <input
                                  type="text"
                                  value={guest.country}
                                  onChange={(e) => updateGuest(index, 'country', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  required
                                />
                              </div>
                            </div>

                            {/* Firma */}
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Firma Digital
                              </label>
                              <div className="border border-gray-300 rounded-md p-4">
                                <canvas
                                  ref={(el) => (canvasRefs.current[index] = el)}
                                  width={400}
                                  height={100}
                                  className="border border-gray-200 rounded cursor-crosshair"
                                  onMouseDown={(e) => startDrawing(index, e)}
                                />
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => clearSignature(index)}
                                    className="text-sm text-red-600 hover:text-red-800"
                                  >
                                    Limpiar firma
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Aceptación de normas */}
                            <div className="mt-4">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={guest.accepts_rules}
                                  onChange={(e) => updateGuest(index, 'accepts_rules', e.target.checked)}
                                  className="mr-2"
                                  required
                                />
                                <span className="text-sm text-gray-700">
                                  Acepto las normas de la casa y el reglamento interno
                                </span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Solicitudes especiales */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Solicitudes Especiales (opcional)
                      </label>
                      <textarea
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Alergias, preferencias, etc."
                      />
                    </div>

                    {/* Botones */}
                    <div className="flex space-x-3 pt-6">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {loading ? 'Completando...' : 'Completar Check-in'}
                      </button>
                      
                      <button
                        type="button"
                        className="flex items-center px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
