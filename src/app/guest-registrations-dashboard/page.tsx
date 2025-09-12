"use client";

import { useState, useEffect } from 'react';
import { Download, Eye, Users, FileText, Calendar, Search, Filter, CheckSquare, Square } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

interface ComunicacionPayload {
  codigoEstablecimiento: string;
  contrato?: {
    referencia: string;
    fechaContrato: string;
    fechaEntrada: string;
    fechaSalida: string;
    numPersonas: number;
    numHabitaciones?: number;
    internet?: boolean;
    pago: {
      tipoPago: string;
      fechaPago?: string;
      medioPago?: string;
      titular?: string;
      caducidadTarjeta?: string;
    };
  };
  personas?: any[];
  viajeros?: any[];
  comunicaciones?: Array<{
    contrato: {
      referencia: string;
      fechaContrato: string;
      fechaEntrada: string;
      fechaSalida: string;
      numPersonas: number;
      numHabitaciones?: number;
      internet?: boolean;
      pago: {
        tipoPago: string;
        fechaPago?: string;
        medioPago?: string;
        titular?: string;
        caducidadTarjeta?: string;
      };
    };
    personas?: any[];
    viajeros?: any[];
  }>;
}

interface GuestRegistration {
  id: string;
  reserva_ref: string;
  fecha_entrada: string;
  fecha_salida: string;
  created_at: string;
  updated_at: string;
  viajero: {
    nombre: string;
    apellido1: string;
    apellido2: string;
    nacionalidad: string;
    tipoDocumento: string;
    numeroDocumento: string;
  };
  contrato: {
    codigoEstablecimiento: string;
    referencia: string;
    numHabitaciones: number;
    internet: boolean;
    tipoPago: string;
  };
  data: ComunicacionPayload;
}

export default function GuestRegistrationsDashboard() {
  const [registrations, setRegistrations] = useState<GuestRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstablishment, setFilterEstablishment] = useState("");
  const [generatingXML, setGeneratingXML] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<GuestRegistration | null>(null);
  const [selectedRegistrations, setSelectedRegistrations] = useState<Set<string>>(new Set());
  const [showAllRegistrations, setShowAllRegistrations] = useState(true);

  useEffect(() => {
    loadRegistrations();
  }, [selectedDate, showAllRegistrations]);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const url = showAllRegistrations 
        ? '/api/guest-registrations' 
        : `/api/guest-registrations?date=${selectedDate}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('La respuesta no es JSON válido');
      }
      
      const data = await response.json();
      console.log('Registros cargados:', data);
      
      // Manejar tanto array directo como objeto con items
      const registrationsData = Array.isArray(data) ? data : (data.items || []);
      setRegistrations(registrationsData);
      setSelectedRegistrations(new Set()); // Reset selección
    } catch (error) {
      console.error('Error cargando registros:', error);
      // En caso de error, mostrar datos de ejemplo para desarrollo
      setRegistrations([]);
      alert(`Error al cargar registros: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const generateXML = async (registration: GuestRegistration) => {
    setGeneratingXML(true);
    try {
      // Mapear datos del formulario público al formato MIR v1.1.1
      const mapearPersona = (persona: any) => {
        return {
          rol: 'VI', // Siempre VI para Partes de viajeros
          nombre: persona.nombre || persona.nombreCompleto?.split(' ')[0] || '',
          apellido1: persona.primerApellido || persona.apellido1 || '',
          apellido2: persona.segundoApellido || persona.apellido2 || '',
          tipoDocumento: persona.tipoDocumento || '',
          numeroDocumento: persona.numeroDocumento || '',
          soporteDocumento: persona.soporteDocumento || '',
          fechaNacimiento: persona.fechaNacimiento || '',
          nacionalidad: persona.nacionalidadISO2 ? 
            (persona.nacionalidadISO2 === 'ES' ? 'ESP' : 
             persona.nacionalidadISO2 === 'FR' ? 'FRA' :
             persona.nacionalidadISO2 === 'DE' ? 'DEU' :
             persona.nacionalidadISO2 === 'IT' ? 'ITA' :
             persona.nacionalidadISO2 === 'PT' ? 'PRT' :
             persona.nacionalidadISO2 === 'GB' ? 'GBR' :
             persona.nacionalidadISO2 === 'US' ? 'USA' :
             'ESP') : 'ESP',
          sexo: persona.sexo === 'Hombre' ? 'H' : persona.sexo === 'Mujer' ? 'M' : 'O',
          telefono: persona.telefono || persona.telefono2 || '000000000',
          telefono2: persona.telefono2 || '',
          correo: persona.email || persona.correo || 'no-email@example.com',
          direccion: {
            direccion: persona.direccion?.direccion || persona.direccion || '',
            direccionComplementaria: persona.direccion?.direccionComplementaria || persona.direccionComplementaria || '',
            codigoPostal: persona.direccion?.codigoPostal || persona.cp || persona.codigoPostal || '',
            pais: persona.direccion?.pais || 
                  (persona.paisResidencia === 'ES' ? 'ESP' : 
                   persona.paisResidencia === 'FR' ? 'FRA' :
                   persona.paisResidencia === 'DE' ? 'DEU' :
                   persona.paisResidencia === 'IT' ? 'ITA' :
                   persona.paisResidencia === 'PT' ? 'PRT' :
                   persona.paisResidencia === 'GB' ? 'GBR' :
                   persona.paisResidencia === 'US' ? 'USA' :
                   'ESP'),
            codigoMunicipio: persona.direccion?.codigoMunicipio || persona.ine || persona.codigoMunicipio || '',
            nombreMunicipio: persona.direccion?.nombreMunicipio || persona.nombreMunicipio || ''
          }
        };
      };

      const mapearContrato = (contrato: any) => {
        return {
          referencia: contrato.referencia || '0000146967',
          fechaContrato: contrato.fechaContrato || new Date().toISOString().split('T')[0],
          fechaEntrada: contrato.entrada || contrato.fechaEntrada || '',
          fechaSalida: contrato.salida || contrato.fechaSalida || '',
          numPersonas: contrato.numPersonas || 1,
          numHabitaciones: contrato.nHabitaciones || contrato.numHabitaciones || 1,
          internet: contrato.internet || false,
          pago: {
            tipoPago: contrato.tipoPagoCode || contrato.pago?.tipoPago || 'EFECT',
            fechaPago: contrato.fechaPago || contrato.pago?.fechaPago || contrato.fechaContrato || new Date().toISOString().split('T')[0],
            medioPago: contrato.medioPago || contrato.pago?.medioPago || 'Efectivo',
            titular: contrato.titular?.nombreCompleto || contrato.pago?.titular || 'Titular por defecto',
            caducidadTarjeta: contrato.titular?.tarjetaCaducidad || contrato.pago?.caducidadTarjeta || ''
          }
        };
      };

      // Debug: Ver la estructura real de los datos
      console.log('🔍 Debug - registration.data:', JSON.stringify(registration.data, null, 2));
      console.log('🔍 Debug - registration.contrato:', JSON.stringify(registration.contrato, null, 2));

      const payload = {
        codigoEstablecimiento: registration.contrato.codigoEstablecimiento || '0000256653',
        comunicaciones: [{
          contrato: mapearContrato(registration.data.comunicaciones?.[0]?.contrato || registration.data.contrato),
          personas: registration.data.comunicaciones?.[0]?.personas?.map(mapearPersona) ||
                   registration.data.comunicaciones?.[0]?.viajeros?.map(mapearPersona) ||
                   registration.data.personas?.map(mapearPersona) || 
                   registration.data.viajeros?.map(mapearPersona) || []
        }]
      };

      console.log('📤 Payload mapeado para MIR:', JSON.stringify(payload, null, 2));

      const res = await fetch("/api/ministerio/partes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errorData;
        try {
          // Try to parse as JSON
          errorData = await res.json();
        } catch (e) {
          // If JSON parsing fails, read as text
          const textResponse = await res.text().catch(() => 'Unable to read response body');
          console.error('❌ Error del servidor (text):', textResponse);
          errorData = { error: textResponse, details: [] };
        }
        
        console.error('❌ Error del servidor:', JSON.stringify(errorData, null, 2));
        
        if (errorData.details && Array.isArray(errorData.details)) {
          throw new Error(`Errores de validación MIR:\n${errorData.details.join('\n')}`);
        } else {
          throw new Error(errorData.error || "Error al generar XML");
        }
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `partes_viajeros_${registration.created_at}_${registration.contrato.referencia}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      alert("XML generado y descargado correctamente");
    } catch (error) {
      console.error('Error generando XML:', error);
      alert(`Error al generar XML: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setGeneratingXML(false);
    }
  };

  const generateConjuntoXML = async () => {
    if (selectedRegistrations.size === 0) {
      alert("Por favor, selecciona al menos un registro para generar XML conjunto");
      return;
    }

    setGeneratingXML(true);
    try {
      const selectedData = registrations.filter(reg => selectedRegistrations.has(reg.id));
      
      // Mapear datos del formulario público al formato MIR v1.1.1
      const mapearPersona = (persona: any) => {
        return {
          rol: 'VI', // Siempre VI para Partes de viajeros
          nombre: persona.nombre || persona.nombreCompleto?.split(' ')[0] || '',
          apellido1: persona.primerApellido || persona.apellido1 || '',
          apellido2: persona.segundoApellido || persona.apellido2 || '',
          tipoDocumento: persona.tipoDocumento || '',
          numeroDocumento: persona.numeroDocumento || '',
          soporteDocumento: persona.soporteDocumento || '',
          fechaNacimiento: persona.fechaNacimiento || '',
          nacionalidad: persona.nacionalidadISO2 ? 
            (persona.nacionalidadISO2 === 'ES' ? 'ESP' : 
             persona.nacionalidadISO2 === 'FR' ? 'FRA' :
             persona.nacionalidadISO2 === 'DE' ? 'DEU' :
             persona.nacionalidadISO2 === 'IT' ? 'ITA' :
             persona.nacionalidadISO2 === 'PT' ? 'PRT' :
             persona.nacionalidadISO2 === 'GB' ? 'GBR' :
             persona.nacionalidadISO2 === 'US' ? 'USA' :
             'ESP') : 'ESP',
          sexo: persona.sexo === 'Hombre' ? 'H' : persona.sexo === 'Mujer' ? 'M' : 'O',
          telefono: persona.telefono || persona.telefono2 || '000000000',
          telefono2: persona.telefono2 || '',
          correo: persona.email || persona.correo || 'no-email@example.com',
          direccion: {
            direccion: persona.direccion?.direccion || persona.direccion || '',
            direccionComplementaria: persona.direccion?.direccionComplementaria || persona.direccionComplementaria || '',
            codigoPostal: persona.direccion?.codigoPostal || persona.cp || persona.codigoPostal || '',
            pais: persona.direccion?.pais || 
                  (persona.paisResidencia === 'ES' ? 'ESP' : 
                   persona.paisResidencia === 'FR' ? 'FRA' :
                   persona.paisResidencia === 'DE' ? 'DEU' :
                   persona.paisResidencia === 'IT' ? 'ITA' :
                   persona.paisResidencia === 'PT' ? 'PRT' :
                   persona.paisResidencia === 'GB' ? 'GBR' :
                   persona.paisResidencia === 'US' ? 'USA' :
                   'ESP'),
            codigoMunicipio: persona.direccion?.codigoMunicipio || persona.ine || persona.codigoMunicipio || '',
            nombreMunicipio: persona.direccion?.nombreMunicipio || persona.nombreMunicipio || ''
          }
        };
      };

      const mapearContrato = (contrato: any) => {
        return {
          referencia: contrato.referencia || '0000146967',
          fechaContrato: contrato.fechaContrato || new Date().toISOString().split('T')[0],
          fechaEntrada: contrato.entrada || contrato.fechaEntrada || '',
          fechaSalida: contrato.salida || contrato.fechaSalida || '',
          numPersonas: contrato.numPersonas || 1,
          numHabitaciones: contrato.nHabitaciones || contrato.numHabitaciones || 1,
          internet: contrato.internet || false,
          pago: {
            tipoPago: contrato.tipoPagoCode || contrato.pago?.tipoPago || 'EFECT',
            fechaPago: contrato.fechaPago || contrato.pago?.fechaPago || contrato.fechaContrato || new Date().toISOString().split('T')[0],
            medioPago: contrato.medioPago || contrato.pago?.medioPago || 'Efectivo',
            titular: contrato.titular?.nombreCompleto || contrato.pago?.titular || 'Titular por defecto',
            caducidadTarjeta: contrato.titular?.tarjetaCaducidad || contrato.pago?.caducidadTarjeta || ''
          }
        };
      };
      
      // Agrupar por establecimiento
      const groupedByEstablishment = selectedData.reduce((acc, reg) => {
        const est = reg.contrato.codigoEstablecimiento || '0000256653';
        if (!acc[est]) {
          acc[est] = [];
        }
        acc[est].push({
          contrato: mapearContrato(reg.data.comunicaciones?.[0]?.contrato || reg.data.contrato),
          personas: reg.data.comunicaciones?.[0]?.personas?.map(mapearPersona) ||
                   reg.data.comunicaciones?.[0]?.viajeros?.map(mapearPersona) ||
                   reg.data.personas?.map(mapearPersona) || 
                   reg.data.viajeros?.map(mapearPersona) || []
        });
        return acc;
      }, {} as Record<string, any[]>);

      // Generar XML para cada establecimiento
      for (const [establecimiento, comunicaciones] of Object.entries(groupedByEstablishment)) {
        const payload = {
          codigoEstablecimiento: establecimiento,
          comunicaciones
        };

        console.log('📤 Payload conjunto mapeado para MIR:', JSON.stringify(payload, null, 2));

        const res = await fetch("/api/ministerio/partes-conjunto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          let errorData;
          try {
            // Try to parse as JSON
            errorData = await res.json();
          } catch (e) {
            // If JSON parsing fails, read as text
            const textResponse = await res.text().catch(() => 'Unable to read response body');
            console.error('❌ Error del servidor (text):', textResponse);
            errorData = { error: textResponse, details: [] };
          }
          
          console.error('❌ Error del servidor:', JSON.stringify(errorData, null, 2));
          
          if (errorData.details && Array.isArray(errorData.details)) {
            throw new Error(`Errores de validación MIR para ${establecimiento}:\n${errorData.details.join('\n')}`);
          } else {
            throw new Error(errorData.error || `Error al generar XML para ${establecimiento}`);
          }
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `partes_viajeros_conjunto_${establecimiento}_${new Date().toISOString().slice(0,10)}.xml`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      alert(`XML conjunto generado correctamente para ${Object.keys(groupedByEstablishment).length} establecimiento(s)`);
      setSelectedRegistrations(new Set()); // Reset selección
    } catch (error) {
      console.error('Error generando XML conjunto:', error);
      alert("Error al generar XML conjunto");
    } finally {
      setGeneratingXML(false);
    }
  };

  const toggleRegistrationSelection = (id: string) => {
    const newSelection = new Set(selectedRegistrations);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRegistrations(newSelection);
  };

  const toggleAllRegistrations = () => {
    if (selectedRegistrations.size === filteredRegistrations.length) {
      setSelectedRegistrations(new Set());
    } else {
      setSelectedRegistrations(new Set(filteredRegistrations.map(reg => reg.id)));
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = reg.contrato.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reg.viajero.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reg.viajero.apellido1.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstablishment = !filterEstablishment || 
                                reg.contrato.codigoEstablecimiento === filterEstablishment;
    return matchesSearch && matchesEstablishment;
  });

  const uniqueEstablishments = [...new Set(registrations.map(r => r.contrato.codigoEstablecimiento))];

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🐬</div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando registros de viajeros...</p>
            <p className="text-sm text-gray-500 mt-2">Conectando con la base de datos</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">🐬</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delfín Check-in</h1>
                <p className="text-sm text-gray-600">Dashboard de Registros de Viajeros</p>
                <p className="text-xs text-gray-500">Gestión y generación de XML para Ministerio del Interior</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/admin/logout', { method: 'POST' });
                    window.location.href = '/admin-login';
                  } catch (error) {
                    console.error('Error en logout:', error);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showAllRegistrations}
                onChange={(e) => setShowAllRegistrations(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label className="text-sm font-medium text-gray-700">Mostrar todos los registros</label>
            </div>
            {!showAllRegistrations && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha específica</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Establecimiento</label>
              <select
                value={filterEstablishment}
                onChange={(e) => setFilterEstablishment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {uniqueEstablishments.map(est => (
                  <option key={est} value={est}>{est}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Referencia, nombre, apellido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadRegistrations}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Filter className="h-4 w-4 inline mr-2" />
                Filtrar
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Registros</p>
                <p className="text-2xl font-bold text-gray-900">{filteredRegistrations.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Viajeros</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredRegistrations.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Registros Seleccionados</p>
                <p className="text-2xl font-bold text-gray-900">{selectedRegistrations.size}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Download className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Establecimientos</p>
                <p className="text-2xl font-bold text-gray-900">{uniqueEstablishments.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CheckSquare className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Acciones</p>
                <div className="space-y-1">
                  <button
                    onClick={generateConjuntoXML}
                    disabled={generatingXML || selectedRegistrations.size === 0}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                  >
                    {generatingXML ? "Generando..." : "XML Conjunto"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de registros */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Registros de Viajeros</h3>
            {filteredRegistrations.length > 0 && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleAllRegistrations}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedRegistrations.size === filteredRegistrations.length ? "Deseleccionar todo" : "Seleccionar todo"}
                </button>
                {selectedRegistrations.size > 0 && (
                  <button
                    onClick={generateConjuntoXML}
                    disabled={generatingXML}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4 inline mr-2" />
                    {generatingXML ? "Generando..." : `Generar XML Conjunto (${selectedRegistrations.size})`}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="p-6">
            {filteredRegistrations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🐬</div>
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {registrations.length === 0 ? 'No hay registros aún' : 'No hay registros para los filtros seleccionados'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {registrations.length === 0 
                    ? 'Los clientes pueden enviar registros desde el formulario público'
                    : 'Intenta ajustar los filtros de búsqueda'
                  }
                </p>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>• Los registros aparecerán aquí cuando los clientes completen el formulario</p>
                  <p>• Puedes generar XML individual o conjunto para enviar al Ministerio del Interior</p>
                  <p>• Usa los filtros para encontrar registros específicos</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRegistrations.map((registration) => (
                  <div key={registration.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedRegistrations.has(registration.id)}
                          onChange={() => toggleRegistrationSelection(registration.id)}
                          className="rounded border-gray-300 h-5 w-5"
                        />
                        <div className="text-2xl">📋</div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Referencia: {registration.contrato.referencia}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Establecimiento: {registration.contrato.codigoEstablecimiento} | 
                            Fecha: {new Date(registration.created_at).toLocaleDateString('es-ES')}
                          </p>
                          <p className="text-sm text-gray-500">
                            Viajero: {registration.viajero.nombre} {registration.viajero.apellido1} | 
                            Entrada: {new Date(registration.fecha_entrada).toLocaleDateString('es-ES')} | 
                            Salida: {new Date(registration.fecha_salida).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedRegistration(registration)}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                          <Eye className="h-4 w-4 inline mr-1" />
                          Ver
                        </button>
                        <button
                          onClick={() => generateXML(registration)}
                          disabled={generatingXML}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <Download className="h-4 w-4 inline mr-1" />
                          {generatingXML ? "Generando..." : "XML Individual"}
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

      {/* Modal para ver detalles */}
      {selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles del Registro - {selectedRegistration.contrato.referencia}
              </h3>
              <button
                onClick={() => setSelectedRegistration(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {/* Información del contrato */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Información del Contrato</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Referencia:</span>
                    <p className="text-gray-900">{selectedRegistration.contrato.referencia}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Establecimiento:</span>
                    <p className="text-gray-900">{selectedRegistration.contrato.codigoEstablecimiento}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Fecha Registro:</span>
                    <p className="text-gray-900">{new Date(selectedRegistration.created_at).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Nº Habitaciones:</span>
                    <p className="text-gray-900">{selectedRegistration.contrato.numHabitaciones}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Entrada:</span>
                    <p className="text-gray-900">{new Date(selectedRegistration.fecha_entrada).toLocaleString('es-ES')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Salida:</span>
                    <p className="text-gray-900">{new Date(selectedRegistration.fecha_salida).toLocaleString('es-ES')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Tipo Pago:</span>
                    <p className="text-gray-900">{selectedRegistration.contrato.tipoPago}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Internet:</span>
                    <p className="text-gray-900">{selectedRegistration.contrato.internet ? "Sí" : "No"}</p>
                  </div>
                </div>
              </div>

              {/* Información del viajero */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Información del Viajero</h4>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Nombre:</span>
                      <p className="text-gray-900">{selectedRegistration.viajero.nombre} {selectedRegistration.viajero.apellido1} {selectedRegistration.viajero.apellido2 || ""}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Documento:</span>
                      <p className="text-gray-900">
                        {selectedRegistration.viajero.tipoDocumento}: {selectedRegistration.viajero.numeroDocumento}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Nacionalidad:</span>
                      <p className="text-gray-900">{selectedRegistration.viajero.nacionalidad}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Datos completos:</span>
                      <p className="text-gray-900 text-xs">
                        {JSON.stringify(selectedRegistration.data, null, 2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedRegistration(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  generateXML(selectedRegistration);
                  setSelectedRegistration(null);
                }}
                disabled={generatingXML}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4 inline mr-1" />
                {generatingXML ? "Generando..." : "Generar XML Individual"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
