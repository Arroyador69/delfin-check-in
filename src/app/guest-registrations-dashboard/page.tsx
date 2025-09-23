"use client";

import { useState, useEffect } from 'react';
import { Download, Eye, Users, FileText, Calendar, Search, Filter, CheckSquare, Square, Trash2, AlertTriangle } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import ExportButton, { normalizeData } from './ExportButton';

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
  const [editData, setEditData] = useState<any | null>(null);
  const [selectedRegistrations, setSelectedRegistrations] = useState<Set<string>>(new Set());
  const [showAllRegistrations, setShowAllRegistrations] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'single' | 'multiple';
    ids: string[];
    names: string[];
  } | null>(null);

  // Abrir bitácora en nueva pestaña (usa hash persistido o calculado al vuelo)
  const openAuditFor = async (reg: any) => {
    try {
      let hash: string | undefined = reg?.data?.audit_hash;
      if (!hash) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(JSON.stringify(reg.data || {}));
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      if (hash) {
        window.open(`/api/audit?entityId=${hash}`, '_blank');
      } else {
        alert('No se pudo calcular el hash del registro');
      }
    } catch (e) {
      alert('No se pudo abrir la bitácora');
    }
  };

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

  // Función simplificada que prepara los datos para el ExportButton
  const prepareSolicitudData = (registration: GuestRegistration) => {
    return {
      codigoEstablecimiento: registration.contrato.codigoEstablecimiento || '0000256653',
      comunicaciones: [{
        contrato: registration.data.comunicaciones?.[0]?.contrato || registration.data.contrato || {},
        personas: registration.data.comunicaciones?.[0]?.personas || 
                 registration.data.comunicaciones?.[0]?.viajeros ||
                 registration.data.personas || 
                 registration.data.viajeros || []
      }]
    };
  };

  // Función simplificada para XML conjunto que usa el nuevo endpoint robusto
  const generateConjuntoXML = async () => {
    if (selectedRegistrations.size === 0) {
      alert("Por favor, selecciona al menos un registro para generar XML conjunto");
      return;
    }

    setGeneratingXML(true);
    try {
      const selectedData = registrations.filter(reg => selectedRegistrations.has(reg.id));
      
      // Usar la misma función de normalización que funciona para XML individuales
      const comunicaciones = selectedData.flatMap(reg => {
        // Pasar el registro completo (no solo data) para que pueda acceder a fecha_entrada y fecha_salida
        const fullRegistration = {
          ...reg.data,
          fecha_entrada: reg.fecha_entrada,
          fecha_salida: reg.fecha_salida
        };
        const normalized = normalizeData(fullRegistration);
        return normalized.comunicaciones;
      });

      const payload = {
        codigoEstablecimiento: selectedData[0]?.contrato?.codigoEstablecimiento || '0000256653',
        comunicaciones
      };

      console.log('📤 Payload conjunto para nuevo endpoint:', JSON.stringify(payload, null, 2));

      // Usar el nuevo endpoint robusto
      const res = await fetch("/api/export/pv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        // Intentar leer JSON; si no, texto
        let error: any = { 
          error: `${res.status} ${res.statusText}`, 
          details: [] as string[],
          correlationId: res.headers.get('x-correlation-id') || 'N/A'
        };
        
        try {
          const j = await res.json();
          error = { ...error, ...j };
        } catch {
          try {
            const t = await res.text();
            error.error = t || error.error;
          } catch {}
        }
        
        console.error('❌ Error del servidor:', JSON.stringify(error, null, 2));
        
        if (Array.isArray(error.details) && error.details.length) {
          throw new Error(`Errores de validación MIR:\n${error.details.join('\n')}\n\nID: ${error.correlationId}`);
        }
        
        throw new Error(`${error.error}\nID: ${error.correlationId}`);
      }

      // Descargar archivo
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `partes_viajeros_conjunto_${new Date().toISOString().slice(0,10)}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      alert("XML conjunto generado y descargado correctamente");
      setSelectedRegistrations(new Set()); // Reset selección
    } catch (error) {
      console.error('Error generando XML conjunto:', error);
      alert(`Error al generar XML conjunto:\n${error instanceof Error ? error.message : 'Error desconocido'}`);
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

  // Función para eliminar registro individual
  const deleteRegistration = async (id: string) => {
    const registration = registrations.find(reg => reg.id === id);
    if (!registration) return;

    setConfirmDelete({
      type: 'single',
      ids: [id],
      names: [`${registration.viajero.nombre} ${registration.viajero.apellido1} (${registration.contrato.referencia})`]
    });
  };

  // Función para eliminar registros seleccionados
  const deleteSelectedRegistrations = async () => {
    if (selectedRegistrations.size === 0) return;

    const selectedData = registrations.filter(reg => selectedRegistrations.has(reg.id));
    const names = selectedData.map(reg => 
      `${reg.viajero.nombre} ${reg.viajero.apellido1} (${reg.contrato.referencia})`
    );

    setConfirmDelete({
      type: 'multiple',
      ids: Array.from(selectedRegistrations),
      names
    });
  };

  // Función para confirmar eliminación
  const confirmDeletion = async () => {
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const { type, ids } = confirmDelete;
      
      let url = '/api/guest-registrations?';
      if (type === 'single') {
        url += `id=${ids[0]}`;
      } else {
        url += `ids=${ids.join(',')}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Eliminación exitosa:', result);

      // Recargar registros
      await loadRegistrations();
      
      // Mostrar mensaje de éxito
      const message = type === 'single' 
        ? 'Registro eliminado correctamente'
        : `${result.deletedCount} registros eliminados correctamente`;
      
      alert(message);

    } catch (error) {
      console.error('❌ Error eliminando registros:', error);
      alert(`Error al eliminar registros:\n${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
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
                <p className="text-sm text-gray-600">Registros de formularios</p>
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
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50 block w-full"
                  >
                    {generatingXML ? "Generando..." : "XML Conjunto"}
                  </button>
                  <button
                    onClick={deleteSelectedRegistrations}
                    disabled={deleting || selectedRegistrations.size === 0}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded disabled:opacity-50 block w-full"
                  >
                    {deleting ? "Eliminando..." : `Eliminar (${selectedRegistrations.size})`}
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
                  <div className="flex space-x-2">
                    <button
                      onClick={generateConjuntoXML}
                      disabled={generatingXML}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4 inline mr-2" />
                      {generatingXML ? "Generando..." : `Generar XML Conjunto (${selectedRegistrations.size})`}
                    </button>
                    <button
                      onClick={deleteSelectedRegistrations}
                      disabled={deleting}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 inline mr-2" />
                      {deleting ? "Eliminando..." : `Eliminar Seleccionados (${selectedRegistrations.size})`}
                    </button>
                  </div>
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
                          onClick={() => openAuditFor(registration)}
                          className="px-3 py-2 bg-white border text-gray-700 rounded-md hover:bg-gray-50"
                        >
                          Ver bitácora
                        </button>
                        <ExportButton
                          solicitud={prepareSolicitudData(registration)}
                          onSuccess={() => alert("XML generado y descargado correctamente")}
                          onError={(error) => alert(`Error al generar XML:\n${error}`)}
                        />
                        <a
                          href={`/api/export/aeat?from=${new Date().toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}&vat=21&format=csv`}
                          target="_blank"
                          className="px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                        >
                          Exportar AEAT CSV
                        </a>
                        <button
                          onClick={() => deleteRegistration(registration.id)}
                          disabled={deleting}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4 inline mr-1" />
                          Eliminar
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

      {/* Modal de confirmación de eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-full mr-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirmar Eliminación
                </h3>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                {confirmDelete.type === 'single' 
                  ? '¿Estás seguro de que quieres eliminar este registro?'
                  : `¿Estás seguro de que quieres eliminar ${confirmDelete.ids.length} registros?`
                }
              </p>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                {confirmDelete.names.map((name, index) => (
                  <div key={index} className="text-sm text-gray-600 py-1">
                    • {name}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      ⚠️ Esta acción no se puede deshacer
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Los registros eliminados no podrán ser recuperados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletion}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {deleting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

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

              {/* Bitácora */}
              <div className="mb-6 bg-gray-50 border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Bitácora</h4>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 break-all">
                    Hash: {selectedRegistration?.data?.audit_hash || 'calculando…'}
                  </p>
                  <button
                    onClick={() => openAuditFor(selectedRegistration)}
                    className="px-3 py-1.5 bg-white border text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                  >
                    Ver bitácora
                  </button>
                </div>
              </div>

              {/* Información del viajero (editable) */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Información del Viajero</h4>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <form className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedRegistration) return;
                    try {
                      const updated = { ...selectedRegistration.data };
                      const p = (updated.comunicaciones?.[0]?.personas?.[0]) || {};
                      p.nombre = (document.getElementById('edit_nombre') as HTMLInputElement).value || p.nombre;
                      p.apellido1 = (document.getElementById('edit_apellido1') as HTMLInputElement).value || p.apellido1;
                      p.fechaNacimiento = (document.getElementById('edit_fechaNacimiento') as HTMLInputElement).value || p.fechaNacimiento;
                      p.tipoDocumento = (document.getElementById('edit_tipoDocumento') as HTMLInputElement).value || p.tipoDocumento;
                      p.numeroDocumento = (document.getElementById('edit_numeroDocumento') as HTMLInputElement).value || p.numeroDocumento;
                      if (!updated.comunicaciones) updated.comunicaciones = [{ contrato: {}, personas: [p] }];
                      else {
                        if (!updated.comunicaciones[0]) updated.comunicaciones[0] = { contrato: {}, personas: [p] } as any;
                        if (!updated.comunicaciones[0].personas) updated.comunicaciones[0].personas = [p];
                        else updated.comunicaciones[0].personas[0] = p;
                      }
                      const res = await fetch('/api/guest-registrations', {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: selectedRegistration.id, data: updated })
                      });
                      const json = await res.json();
                      if (!res.ok || !json.ok) throw new Error(json.error || 'Error al guardar cambios');
                      alert('Cambios guardados');
                      setSelectedRegistration({ ...selectedRegistration, data: json.item.data } as any);
                      await loadRegistrations();
                    } catch (err: any) {
                      alert(err.message || 'Error');
                    }
                  }}>
                    <div>
                      <label className="block text-gray-600 mb-1">Nombre</label>
                      <input id="edit_nombre" defaultValue={selectedRegistration.viajero.nombre} className="border rounded px-2 py-1 w-full" />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Apellido 1</label>
                      <input id="edit_apellido1" defaultValue={selectedRegistration.viajero.apellido1} className="border rounded px-2 py-1 w-full" />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Fecha nacimiento (AAAA-MM-DD)</label>
                      <input id="edit_fechaNacimiento" type="date" className="border rounded px-2 py-1 w-full" />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Tipo documento</label>
                      <input id="edit_tipoDocumento" defaultValue={selectedRegistration.viajero.tipoDocumento} className="border rounded px-2 py-1 w-full" />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Número documento</label>
                      <input id="edit_numeroDocumento" defaultValue={selectedRegistration.viajero.numeroDocumento} className="border rounded px-2 py-1 w-full" />
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                      <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Guardar cambios</button>
                    </div>
                  </form>
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
              <ExportButton
                solicitud={prepareSolicitudData(selectedRegistration)}
                onSuccess={() => {
                  alert("XML generado y descargado correctamente");
                  setSelectedRegistration(null);
                }}
                onError={(error) => alert(`Error al generar XML:\n${error}`)}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
