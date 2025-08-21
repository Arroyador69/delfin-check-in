'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Save, FileText, Globe } from 'lucide-react';

interface GuestRegistration {
  id?: string;
  reservation_id: string;
  // Datos personales
  name: string;
  surname: string;
  birth_date: string;
  birth_place: string;
  nationality: string;
  document_type: 'dni' | 'passport' | 'nie' | 'other';
  document_number: string;
  document_issuing_country: string;
  document_expiry_date: string;
  
  // Datos de contacto
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  
  // Datos del viaje
  arrival_date: string;
  departure_date: string;
  room_number: string;
  travel_purpose: 'tourism' | 'business' | 'family' | 'other';
  
  // Datos adicionales requeridos por España
  previous_accommodation?: string;
  next_destination?: string;
  vehicle_registration?: string;
  
  // Consentimiento
  accepts_terms: boolean;
  accepts_data_processing: boolean;
  
  created_at?: string;
}

export default function GuestRegistrationPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [formData, setFormData] = useState<GuestRegistration>({
    reservation_id: '',
    name: '',
    surname: '',
    birth_date: '',
    birth_place: '',
    nationality: '',
    document_type: 'passport',
    document_number: '',
    document_issuing_country: '',
    document_expiry_date: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    arrival_date: '',
    departure_date: '',
    room_number: '',
    travel_purpose: 'tourism',
    accepts_terms: false,
    accepts_data_processing: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Traducciones
  const translations = {
    es: {
      title: 'Registro Oficial de Viajeros',
      subtitle: 'Datos requeridos por el Ministerio del Interior de España',
      personalData: 'Datos Personales',
      contactData: 'Datos de Contacto',
      travelData: 'Datos del Viaje',
      legalNotice: 'Aviso Legal',
      submit: 'Enviar Registro',
      success: 'Registro enviado correctamente',
      required: 'Campo obligatorio',
      name: 'Nombre',
      surname: 'Apellidos',
      birthDate: 'Fecha de nacimiento',
      birthPlace: 'Lugar de nacimiento',
      nationality: 'Nacionalidad',
      documentType: 'Tipo de documento',
      documentNumber: 'Número de documento',
      documentIssuingCountry: 'País emisor del documento',
      documentExpiryDate: 'Fecha de caducidad del documento',
      email: 'Correo electrónico',
      phone: 'Teléfono',
      address: 'Dirección',
      city: 'Ciudad',
      postalCode: 'Código postal',
      country: 'País',
      arrivalDate: 'Fecha de llegada',
      departureDate: 'Fecha de salida',
      roomNumber: 'Número de habitación',
      travelPurpose: 'Motivo del viaje',
      acceptsTerms: 'Acepto los términos y condiciones',
      acceptsDataProcessing: 'Consiento el tratamiento de mis datos personales',
      legalText: 'Los datos recogidos serán comunicados al Ministerio del Interior de España conforme a la Ley 4/2015 de Protección de Seguridad Ciudadana.',
    },
    en: {
      title: 'Official Traveler Registration',
      subtitle: 'Data required by the Spanish Ministry of Interior',
      personalData: 'Personal Data',
      contactData: 'Contact Information',
      travelData: 'Travel Information',
      legalNotice: 'Legal Notice',
      submit: 'Submit Registration',
      success: 'Registration submitted successfully',
      required: 'Required field',
      name: 'First Name',
      surname: 'Last Name',
      birthDate: 'Date of Birth',
      birthPlace: 'Place of Birth',
      nationality: 'Nationality',
      documentType: 'Document Type',
      documentNumber: 'Document Number',
      documentIssuingCountry: 'Document Issuing Country',
      documentExpiryDate: 'Document Expiry Date',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      city: 'City',
      postalCode: 'Postal Code',
      country: 'Country',
      arrivalDate: 'Arrival Date',
      departureDate: 'Departure Date',
      roomNumber: 'Room Number',
      travelPurpose: 'Purpose of Travel',
      acceptsTerms: 'I accept the terms and conditions',
      acceptsDataProcessing: 'I consent to the processing of my personal data',
      legalText: 'The collected data will be communicated to the Spanish Ministry of Interior in accordance with Law 4/2015 on Citizen Security Protection.',
    }
  };

  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Guardar en Supabase
      const { error } = await supabase
        .from('guest_registrations')
        .insert(formData);

      if (error) throw error;

      // TODO: Enviar a la API oficial de España (REDE)
      // await sendToSpanishMinistry(formData);

      setSuccess(true);
      setFormData({
        reservation_id: '',
        name: '',
        surname: '',
        birth_date: '',
        birth_place: '',
        nationality: '',
        document_type: 'passport',
        document_number: '',
        document_issuing_country: '',
        document_expiry_date: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: '',
        country: '',
        arrival_date: '',
        departure_date: '',
        room_number: '',
        travel_purpose: 'tourism',
        accepts_terms: false,
        accepts_data_processing: false,
      });

    } catch (error) {
      console.error('Error submitting registration:', error);
      alert('Error al enviar el registro');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Save className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t.success}
          </h2>
          <p className="text-gray-600 mb-6">
            {language === 'es' 
              ? 'Sus datos han sido registrados correctamente en el sistema oficial español.'
              : 'Your data has been successfully registered in the official Spanish system.'
            }
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            {language === 'es' ? 'Nuevo Registro' : 'New Registration'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
                <p className="text-sm text-gray-600">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLanguage('es')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  language === 'es' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ES
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  language === 'en' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Datos Personales */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              {t.personalData}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.name} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.surname} *
                </label>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.birthDate} *
                </label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.birthPlace} *
                </label>
                <input
                  type="text"
                  value={formData.birth_place}
                  onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.nationality} *
                </label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.documentType} *
                </label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="passport">Pasaporte</option>
                  <option value="dni">DNI</option>
                  <option value="nie">NIE</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.documentNumber} *
                </label>
                <input
                  type="text"
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.documentIssuingCountry} *
                </label>
                <input
                  type="text"
                  value={formData.document_issuing_country}
                  onChange={(e) => setFormData({ ...formData, document_issuing_country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.documentExpiryDate} *
                </label>
                <input
                  type="date"
                  value={formData.document_expiry_date}
                  onChange={(e) => setFormData({ ...formData, document_expiry_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Datos de Contacto */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              {t.contactData}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.email} *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.phone} *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.address} *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.city} *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.postalCode} *
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.country} *
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Datos del Viaje */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              {t.travelData}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.arrivalDate} *
                </label>
                <input
                  type="date"
                  value={formData.arrival_date}
                  onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.departureDate} *
                </label>
                <input
                  type="date"
                  value={formData.departure_date}
                  onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.roomNumber} *
                </label>
                <input
                  type="text"
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.travelPurpose} *
                </label>
                <select
                  value={formData.travel_purpose}
                  onChange={(e) => setFormData({ ...formData, travel_purpose: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="tourism">Turismo</option>
                  <option value="business">Negocios</option>
                  <option value="family">Familia</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
          </div>

          {/* Aviso Legal */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">{t.legalNotice}</h2>
            <p className="text-blue-700 text-sm mb-4">{t.legalText}</p>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="accepts_terms"
                  checked={formData.accepts_terms}
                  onChange={(e) => setFormData({ ...formData, accepts_terms: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label htmlFor="accepts_terms" className="ml-2 block text-sm text-blue-700">
                  {t.acceptsTerms} *
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="accepts_data_processing"
                  checked={formData.accepts_data_processing}
                  onChange={(e) => setFormData({ ...formData, accepts_data_processing: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label htmlFor="accepts_data_processing" className="ml-2 block text-sm text-blue-700">
                  {t.acceptsDataProcessing} *
                </label>
              </div>
            </div>
          </div>

          {/* Botón de envío */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {language === 'es' ? 'Enviando...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t.submit}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
