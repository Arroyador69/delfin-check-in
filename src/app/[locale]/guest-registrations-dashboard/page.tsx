\"use client\";

import { useState, useEffect } from 'react';
import { Download, Eye, Users, FileText, Calendar, Search, Filter, CheckSquare, Square, Trash2, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import ExportButton, { normalizeData } from './ExportButton';
import { useTenant, hasLegalModule } from '@/hooks/useTenant';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

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

// Función helper para extraer datos del viajero - VERSIÓN CORRECTA BASADA EN ANÁLISIS PROFUNDO
const getTravelerData = (registration: GuestRegistration) => {
  const data = registration.data;
  
  console.log('🔬 ANÁLISIS PROFUNDO - Estructura de datos:', JSON.stringify(data, null, 2));
  
  // ANÁLISIS PROFUNDO: Los datos de dirección están en data.comunicaciones[0].personas[0].direccion
  const persona = data?.comunicaciones?.[0]?.personas?.[0];
  
  if (!persona) {
    console.log('❌ CRÍTICO: No se encontró persona en data.comunicaciones[0].personas[0]');
    console.log('🔍 Estructura disponible:', JSON.stringify(data, null, 2));
    
    // Fallback: intentar con registration.viajero (sin datos de dirección)
    return {
      nombre: registration.viajero?.nombre || '',
      apellido1: registration.viajero?.apellido1 || '',
      apellido2: registration.viajero?.apellido2 || '',
      tipoDocumento: registration.viajero?.tipoDocumento || '',
      numeroDocumento: registration.viajero?.numeroDocumento || '',
      nacionalidad: registration.viajero?.nacionalidad || '',
      telefono: '',
      correo: '',
      fechaNacimiento: '',
      direccion: {
        direccion: 'DATOS NO ENCONTRADOS',
        codigoPostal: 'DATOS NO ENCONTRADOS',
        pais: 'DATOS NO ENCONTRADOS',
        nombreMunicipio: 'DATOS NO ENCONTRADOS',
        codigoMunicipio: 'DATOS NO ENCONTRADOS'
      }
    };
  }
  
  console.log('✅ ÉXITO: Persona encontrada en data.comunicaciones[0].personas[0]');
  console.log('🔍 Datos de persona:', JSON.stringify(persona, null, 2));
  
  // Extraer datos de dirección del objeto direccion anidado
  const direccion = persona.direccion || {};
  
  console.log('📍 Datos de dirección encontrados:', JSON.stringify(direccion, null, 2));
  
  const result = {
    nombre: persona.nombre || '',
    apellido1: persona.apellido1 || '',
    apellido2: persona.apellido2 || '',
    tipoDocumento: persona.tipoDocumento || '',
    numeroDocumento: persona.numeroDocumento || '',
    nacionalidad: persona.nacionalidad || '',
    telefono: persona.telefono || '',
    correo: persona.correo || '',
    fechaNacimiento: persona.fechaNacimiento || '',
    direccion: {
      direccion: direccion.direccion || '',
      codigoPostal: direccion.codigoPostal || '',
      pais: direccion.pais || '',
      nombreMunicipio: direccion.nombreMunicipio || '',
      codigoMunicipio: direccion.codigoMunicipio || ''
    }
  };
  
  console.log('🎯 RESULTADO FINAL CORRECTO:', JSON.stringify(result, null, 2));
  
  // Verificar si se encontraron datos de dirección
  const tieneDireccion = result.direccion.direccion || result.direccion.codigoPostal || result.direccion.pais || result.direccion.codigoMunicipio;
  if (tieneDireccion) {
    console.log('✅ ÉXITO TOTAL: Datos de dirección encontrados correctamente');
  } else {
    console.log('⚠️ ADVERTENCIA: No se encontraron datos de dirección en el objeto direccion');
    console.log('🔍 Objeto direccion completo:', JSON.stringify(direccion, null, 2));
  }
  
  return result;
};

export default function GuestRegistrationsDashboard() {
  const t = useTranslations('guestRegistrations');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { tenant, loading: tenantLoading } = useTenant();
  const router = useRouter();
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
  const [filterCheckIn, setFilterCheckIn] = useState("");
  const [filterCheckOut, setFilterCheckOut] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [formUrl, setFormUrl] = useState('');

  // Verificar acceso al módulo legal (excepto superadmins)
  useEffect(() => {
    if (!tenantLoading && tenant) {
      // Verificar si es superadmin - SI ES SUPERADMIN, PERMITIR ACCESO COMPLETO
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          const isSuperAdmin = data.success && data.data?.isPlatformAdmin;
          // Superadmins SIEMPRE tienen acceso, sin importar el plan
          if (isSuperAdmin) {
            console.log('👑 SuperAdmin: Acceso completo al módulo legal concedido');
            return; // No hacer nada, permitir acceso
          }
          // Solo para usuarios normales, verificar legal_module
          if (!hasLegalModule(tenant)) {
            router.push('/upgrade-plan?reason=legal_module');
          }
        })
        .catch(() => {
          // Si falla la verificación, verificar si es superadmin de otra forma
          // Por seguridad, si no podemos verificar, permitir acceso si tiene legal_module
          if (!hasLegalModule(tenant)) {
            // Solo bloquear si definitivamente no tiene legal_module
            router.push('/upgrade-plan?reason=legal_module');
          }
        });
    }
  }, [tenant, tenantLoading, router]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(t('urlCopied'));
    } catch (error) {
      console.error('Error copiando:', error);
    }
  };

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
        alert(t('auditHashError'));
      }
    } catch (e) {
      alert(t('auditOpenError'));
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, [selectedDate, showAllRegistrations]);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      
      // Obtener información del tenant para asegurar que tenemos el ID
      let tenantId = tenant?.id;
      
      if (!tenantId) {
        console.log('🔍 No hay tenant del hook, obteniendo desde API...');
        const tenantResponse = await fetch('/api/tenant');
        const tenantData = await tenantResponse.json();
        
        if (tenantData?.tenant?.id) {
          tenantId = tenantData.tenant.id;
          console.log('✅ Tenant ID obtenido desde API:', tenantId);
        }
      } else {
        console.log('✅ Tenant ID del hook:', tenantId);
      }
      
      // Generar URL del formulario (redirección al formulario existente)
      if (tenantId) {
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin
          : (process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3000' 
            : 'https://admin.delfincheckin.com');
        const formUrlValue = `${baseUrl}/api/public/form-redirect/${tenantId}`;
        setFormUrl(formUrlValue);
        console.log('🔗 URL del formulario generada:', formUrlValue);
      } else {
        console.error('❌ No se pudo obtener tenantId para generar URL del formulario');
        setFormUrl('');
      }
      
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
      console.log('📦 Respuesta completa de la API:', data);
      console.log('📊 Estructura de datos:', {
        isArray: Array.isArray(data),
        hasItems: !!data.items,
        itemsLength: data.items?.length || 0,
        ok: data.ok,
        total: data.total
      });
      
      // Manejar tanto array directo como objeto con items
      const registrationsData = Array.isArray(data) ? data : (data.items || []);
      console.log(`✅ ${registrationsData.length} registros procesados para mostrar`);
      setRegistrations(registrationsData);
      setSelectedRegistrations(new Set()); // Reset selección
      
      if (registrationsData.length === 0) {
        console.warn('⚠️ No se encontraron registros. Verificar:');
        console.warn('  - Tenant ID usado:', tenantId);
        console.warn('  - Respuesta de la API:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error('Error cargando registros:', error);
      // En caso de error, mostrar datos de ejemplo para desarrollo
      setRegistrations([]);
      alert(t('loadError', { message: error instanceof Error ? error.message : 'Error desconocido' }));
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
      alert(t('selectOneForXml'));
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

      alert(t('xmlConjuntoGenerated'));
      setSelectedRegistrations(new Set()); // Reset selección
    } catch (error) {
      console.error('Error generando XML conjunto:', error);
      alert(t('xmlConjuntoError') + '\n' + (error instanceof Error ? error.message : 'Error desconocido'));
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
        ? t('delete.successSingle')
        : t('delete.successMultiple', { count: result.deletedCount });
      
      alert(message);

    } catch (error) {
      console.error('❌ Error eliminando registros:', error);
      alert(t('deleteErrorWithMessage', { message: error instanceof Error ? error.message : 'Error desconocido' }));
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
    const matchesCheckIn = !filterCheckIn || 
                          reg.fecha_entrada.split('T')[0] === filterCheckIn;
    const matchesCheckOut = !filterCheckOut || 
                           reg.fecha_salida.split('T')[0] === filterCheckOut;
    const matchesRoom = !filterRoom || 
                       reg.contrato.numHabitaciones.toString() === filterRoom;
    return matchesSearch && matchesEstablishment && matchesCheckIn && matchesCheckOut && matchesRoom;
  });

  const uniqueEstablishments = [...new Set(registrations.map(r => r.contrato.codigoEstablecimiento))];

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🐬</div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('loading')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('loadingDatabase')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout showHeader={false}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header compacto */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="text-2xl mr-2">📋</div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {t('title')}
                  </h1>
                  {tenant?.country_code && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-200">
                      🌍 {t('countries.' + tenant.country_code as any) || tenant.country_code}
                    </span>
                  )}
                  {tenant?.plan_type === 'pro' && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full border border-purple-200">
                      ⭐ PRO - {t('proBadgeAllCountries')}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-600">
                  🏛️ {t('subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/admin/mir-comunicaciones" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center space-x-2 font-semibold shadow"
              >
                <span>📤</span>
                <span>{t('mirStatusLink')}</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Form URL Section */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">🔗</div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('formUrl')}
                </h2>
                <p className="text-sm text-gray-600">
                  {t('formUrlDescription')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={formUrl}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                />
              </div>
                <button
                onClick={() => copyToClipboard(formUrl)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center space-x-2 shadow"
              >
                <Copy className="w-4 h-4" />
                  <span>{t('copyUrl')}</span>
              </button>
              <a
                href={formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-colors flex items-center space-x-2 shadow"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{t('viewForm')}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow p-6 mb-8 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showAllRegistrations}
                onChange={(e) => setShowAllRegistrations(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label className="text-sm font-medium text-gray-700">
                {t('filters.showAll')}
              </label>
            </div>
            {!showAllRegistrations && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('filters.specificDate')}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('filters.establishment')}
              </label>
              <select
                value={filterEstablishment}
                onChange={(e) => setFilterEstablishment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('filters.allEstablishments')}</option>
                {uniqueEstablishments.map(est => (
                  <option key={est} value={est}>{est}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('filters.search')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('filters.checkInDate')}
              </label>
              <input
                type="date"
                value={filterCheckIn}
                onChange={(e) => setFilterCheckIn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('filters.checkOutDate')}
              </label>
              <input
                type="date"
                value={filterCheckOut}
                onChange={(e) => setFilterCheckOut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('filters.roomNumber')}
              </label>
              <input
                type="number"
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                placeholder={t('filters.roomPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadRegistrations}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Filter className="h-4 w-4 inline mr-2" />
                {t('filters.applyFilters')}
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {t('stats.totalRegistrations')}
                </p>
                <p className="text-2xl font-bold text-gray-900">{filteredRegistrations.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {t('stats.totalTravelers')}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredRegistrations.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {t('stats.selected')}
                </p>
                <p className="text-2xl font-bold text-gray-900">{selectedRegistrations.size}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Download className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('stats.establishments')}</p>
                <p className="text-2xl font-bold text-gray-900">{uniqueEstablishments.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CheckSquare className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('stats.actions')}</p>
                <div className="space-y-1">
                  <button
                    onClick={generateConjuntoXML}
                    disabled={generatingXML || selectedRegistrations.size === 0}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50 block w-full"
                  >
                    {generatingXML ? t('generating') : t('exportXMLConjuntoShort')}
                  </button>
                  <button
                    onClick={deleteSelectedRegistrations}
                    disabled={deleting || selectedRegistrations.size === 0}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded disabled:opacity-50 block w-full"
                  >
                    {deleting ? t('list.deleting') : t('list.deleteCount', { count: selectedRegistrations.size })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de registros */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Cabecera fija */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('list.title')}</h2>
                <p className="text-sm text-gray-600 mt-1">{t('totalRegistrations', { count: filteredRegistrations.length })}</p>
              </div>
              {filteredRegistrations.length > 0 && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleAllRegistrations}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {selectedRegistrations.size === filteredRegistrations.length ? t('list.deselectAll') : t('list.selectAll')}
                  </button>
                  {selectedRegistrations.size > 0 && (
                    <div className="flex space-x-2">
                      <button
                        onClick={generateConjuntoXML}
                        disabled={generatingXML}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4 inline mr-2" />
                        {generatingXML ? t('generating') : t('exportXMLConjunto', { count: selectedRegistrations.size })}
                      </button>
                      <button
                        onClick={deleteSelectedRegistrations}
                        disabled={deleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 inline mr-2" />
                        {deleting ? t('list.deleting') : t('list.deleteSelectedLabel', { count: selectedRegistrations.size })}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contenedor con scroll independiente */}
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            <div className="p-6">
              {filteredRegistrations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🐬</div>
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {registrations.length === 0 ? t('noRegistrations') : t('noRegistrationsFiltered')}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {registrations.length === 0 
                      ? t('noRegistrationsDescription')
                      : t('noRegistrationsFilteredDescription')
                    }
                  </p>
                  <div className="space-y-2 text-sm text-gray-400">
                    <p>• {t('infoCards.card1')}</p>
                    <p>• {t('infoCards.card2')}</p>
                    <p>• {t('infoCards.card3')}</p>
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
                              {t('list.reference')}: {registration.contrato.referencia}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {t('list.establishment')}: {registration.contrato.codigoEstablecimiento} | 
                              {t('list.room')}: {registration.contrato.numHabitaciones} | 
                              {t('list.registrationDate')}: {new Date(registration.created_at).toLocaleDateString(locale)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {t('list.traveler')}: {registration.viajero.nombre} {registration.viajero.apellido1}
                            </p>
                            <p className="text-sm text-gray-500">
                              {t('checkIn')}: {new Date(registration.fecha_entrada).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} | 
                              {t('checkOut')}: {new Date(registration.fecha_salida).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedRegistration(registration)}
                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                          >
                            <Eye className="h-4 w-4 inline mr-1" />
                            {t('list.view')}
                          </button>
                          <ExportButton
                            solicitud={prepareSolicitudData(registration)}
                            onSuccess={() => alert(t('xmlGenerated'))}
                            onError={(error) => alert(t('exportError') + '\n' + error)}
                          />
                          <button
                            onClick={() => deleteRegistration(registration.id)}
                            disabled={deleting}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4 inline mr-1" />
                            {t('list.delete')}
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
                  {t('delete.title')}
                </h3>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                {confirmDelete.type === 'single' 
                  ? t('delete.messageSingle')
                  : t('delete.messageMultiple', { count: confirmDelete.ids.length })
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
                      ⚠️ {t('delete.warning')}
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {t('delete.warningDescription')}
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
                {t('delete.cancel')}
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
                {deleting ? t('delete.deleting') : t('delete.confirm')}
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
                {t('modal.title', { reference: selectedRegistration.contrato.referencia })}
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
                <h4 className="font-semibold text-gray-900 mb-3">{t('modal.contractInfo')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">{t('modal.reference')}:</span>
                    <p className="text-gray-900">{selectedRegistration.contrato.referencia}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('modal.establishment')}:</span>
                    <p className="text-gray-900">{selectedRegistration.contrato.codigoEstablecimiento}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('modal.registrationDate')}:</span>
                    <p className="text-gray-900">{new Date(selectedRegistration.created_at).toLocaleDateString(locale)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('modal.rooms')}:</span>
                    <p className="text-gray-900">{selectedRegistration.contrato.numHabitaciones}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('modal.checkIn')}:</span>
                    <p className="text-gray-900">{new Date(selectedRegistration.fecha_entrada).toLocaleString(locale)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('modal.checkOut')}:</span>
                    <p className="text-gray-900">{new Date(selectedRegistration.fecha_salida).toLocaleString(locale)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('modal.paymentType')}:</span>
                    <p className="text-gray-900">{selectedRegistration.contrato.tipoPago}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('modal.internet')}:</span>
                    <p className="text-gray-900">{selectedRegistration.contrato.internet ? t('modal.yes') : t('modal.no')}</p>
                  </div>
                </div>
              </div>

              {/* Bitácora */}
              <div className="mb-6 bg-gray-50 border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{t('modal.audit')}</h4>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 break-all">
                    {t('modal.auditHash')}: {selectedRegistration?.data?.audit_hash || '…'}
                  </p>
                  <button
                    onClick={() => openAuditFor(selectedRegistration)}
                    className="px-3 py-1.5 bg-white border text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                  >
                    {t('modal.viewAudit')}
                  </button>
                </div>
              </div>

              {/* Información del viajero (editable) */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">{t('modal.travelerInfo')}</h4>
                
                {/* Mostrar datos actuales del viajero */}
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-semibold text-blue-900 mb-3 flex items-center">
                    📋 {t('modal.currentData')}
                  </h5>
                  {(() => {
                    const travelerData = getTravelerData(selectedRegistration);
                    console.log('🎯 Modal - Datos del viajero extraídos:', JSON.stringify(travelerData, null, 2));
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-bold text-gray-700">{t('modal.name')}:</span>
                            <p className="font-bold text-gray-900">{travelerData.nombre || t('modal.notSpecified')}</p>
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">{t('modal.firstSurname')}:</span>
                            <p className="font-bold text-gray-900">{travelerData.apellido1 || t('modal.notSpecified')}</p>
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">{t('modal.secondSurname')}:</span>
                            <p className="font-bold text-gray-900">{travelerData.apellido2 || t('modal.notSpecified')}</p>
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">{t('modal.docType')}:</span>
                            <p className="font-bold text-gray-900">{travelerData.tipoDocumento || t('modal.notSpecified')}</p>
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">{t('modal.docNumber')}:</span>
                            <p className="font-bold text-gray-900">{travelerData.numeroDocumento || t('modal.notSpecified')}</p>
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">{t('modal.nationality')}:</span>
                            <p className="font-bold text-gray-900">{travelerData.nacionalidad || t('modal.notSpecified')}</p>
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">{t('modal.phone')}:</span>
                            <p className="font-bold text-gray-900">{travelerData.telefono || t('modal.notSpecified')}</p>
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">{t('modal.email')}:</span>
                            <p className="font-bold text-gray-900">{travelerData.correo || t('modal.notSpecified')}</p>
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">{t('modal.birthDate')}:</span>
                            <p className="font-bold text-gray-900">{travelerData.fechaNacimiento || t('modal.notSpecified')}</p>
                          </div>
                        </div>
                        
                        {/* Dirección */}
                        <div className="mt-4 pt-4 border-t border-blue-300">
                          <h6 className="font-bold text-blue-900 mb-2">📍 {t('modal.addressTitle')}</h6>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-bold text-gray-700">{t('modal.address')}:</span>
                              <p className="font-bold text-gray-900">{travelerData.direccion?.direccion || t('modal.notSpecified')}</p>
                            </div>
                            <div>
                              <span className="font-bold text-gray-700">{t('modal.postalCode')}:</span>
                              <p className="font-bold text-gray-900">{travelerData.direccion?.codigoPostal || t('modal.notSpecified')}</p>
                            </div>
                            <div>
                              <span className="font-bold text-gray-700">{t('modal.country')}:</span>
                              <p className="font-bold text-gray-900">{travelerData.direccion?.pais || t('modal.notSpecified')}</p>
                            </div>
                            <div>
                              <span className="font-bold text-gray-700">{t('modal.municipality')}:</span>
                              <p className="font-bold text-gray-900">{travelerData.direccion?.nombreMunicipio || t('modal.notSpecified')}</p>
                            </div>
                            <div>
                              <span className="font-bold text-gray-700">{t('modal.municipalityCode')}:</span>
                              <p className="font-bold text-gray-900">{travelerData.direccion?.codigoMunicipio || t('modal.notSpecified')}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Formulario de edición */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                    ✏️ {t('modal.editData')}
                  </h5>
                  {(() => {
                    const travelerData = getTravelerData(selectedRegistration);
                    return (
                      <form className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" onSubmit={async (e) => {
                        e.preventDefault();
                        if (!selectedRegistration) return;
                        const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
                        const originalText = t('modal.saveChanges');
                        
                        try {
                          // Mostrar estado de carga
                          submitButton.disabled = true;
                          submitButton.textContent = t('modal.saving');
                          
                          console.log('🔄 Iniciando actualización de registro:', selectedRegistration.id);
                          
                          const updated = { ...selectedRegistration.data };
                          const p = (updated.comunicaciones?.[0]?.personas?.[0]) || {};
                          
                          // Recopilar datos del formulario
                          p.nombre = (document.getElementById('edit_nombre') as HTMLInputElement).value || p.nombre;
                          p.apellido1 = (document.getElementById('edit_apellido1') as HTMLInputElement).value || p.apellido1;
                          p.fechaNacimiento = (document.getElementById('edit_fechaNacimiento') as HTMLInputElement).value || p.fechaNacimiento;
                          p.tipoDocumento = (document.getElementById('edit_tipoDocumento') as HTMLInputElement).value || p.tipoDocumento;
                          p.numeroDocumento = (document.getElementById('edit_numeroDocumento') as HTMLInputElement).value || p.numeroDocumento;
                          p.nacionalidad = (document.getElementById('edit_nacionalidad') as HTMLInputElement)?.value || p.nacionalidad;
                          p.telefono = (document.getElementById('edit_telefono') as HTMLInputElement)?.value || p.telefono;
                          p.correo = (document.getElementById('edit_correo') as HTMLInputElement)?.value || p.correo;
                          
                          // Dirección
                          p.direccion = p.direccion || {};
                          p.direccion.direccion = (document.getElementById('edit_direccion') as HTMLInputElement)?.value || p.direccion.direccion;
                          p.direccion.codigoPostal = (document.getElementById('edit_codigoPostal') as HTMLInputElement)?.value || p.direccion.codigoPostal;
                          p.direccion.pais = (document.getElementById('edit_pais') as HTMLInputElement)?.value || p.direccion.pais;
                          p.direccion.nombreMunicipio = (document.getElementById('edit_nombreMunicipio') as HTMLInputElement)?.value || p.direccion.nombreMunicipio;
                          p.direccion.codigoMunicipio = (document.getElementById('edit_codigoMunicipio') as HTMLInputElement)?.value || p.direccion.codigoMunicipio;
                          
                          // Actualizar estructura de datos
                          if (!updated.comunicaciones) updated.comunicaciones = [{ contrato: {}, personas: [p] }];
                          else {
                            if (!updated.comunicaciones[0]) updated.comunicaciones[0] = { contrato: {}, personas: [p] } as any;
                            if (!updated.comunicaciones[0].personas) updated.comunicaciones[0].personas = [p];
                            else updated.comunicaciones[0].personas[0] = p;
                          }
                          
                          console.log('📊 Datos a enviar:', JSON.stringify(updated, null, 2));
                          
                          const res = await fetch('/api/guest-registrations', {
                            method: 'PUT', 
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: selectedRegistration.id, data: updated })
                          });
                          
                          const json = await res.json();
                          console.log('📥 Respuesta del servidor:', json);
                          
                          if (!res.ok || !json.ok) {
                            throw new Error(json.error || t('modal.saveError'));
                          }
                          
                          alert('✅ Cambios guardados exitosamente');
                          setSelectedRegistration({ ...selectedRegistration, data: json.item.data } as any);
                          await loadRegistrations();
                          
                        } catch (err: any) {
                          console.error('❌ Error al guardar:', err);
                          alert(t('modal.saveError') + ': ' + (err.message || 'Error desconocido'));
                        } finally {
                          // Restaurar botón
                          submitButton.disabled = false;
                          submitButton.textContent = originalText;
                        }
                      }}>
                        <div>
                          <label className="block text-gray-600 mb-1">{t('modal.name')}</label>
                          <input id="edit_nombre" defaultValue={travelerData.nombre} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                        </div>
                        <div>
                          <label className="block text-gray-600 mb-1">{t('modal.firstSurname')}</label>
                          <input id="edit_apellido1" defaultValue={travelerData.apellido1} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                        </div>
                        <div>
                          <label className="block text-gray-600 mb-1">{t('modal.birthDate')} (AAAA-MM-DD)</label>
                          <input id="edit_fechaNacimiento" type="date" defaultValue={travelerData.fechaNacimiento} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                        </div>
                        <div>
                          <label className="block text-gray-600 mb-1">{t('modal.docType')}</label>
                          <input id="edit_tipoDocumento" defaultValue={travelerData.tipoDocumento} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                        </div>
                        <div>
                          <label className="block text-gray-600 mb-1">{t('modal.docNumber')}</label>
                          <input id="edit_numeroDocumento" defaultValue={travelerData.numeroDocumento} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                        </div>
                        <div>
                          <label className="block text-gray-600 mb-1">{t('modal.nationality')} (ISO-3 o nombre)</label>
                          <input id="edit_nacionalidad" defaultValue={travelerData.nacionalidad} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                        </div>
                        <div>
                          <label className="block text-gray-600 mb-1">{t('modal.phone')}</label>
                          <input id="edit_telefono" defaultValue={travelerData.telefono} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                        </div>
                        <div>
                          <label className="block text-gray-600 mb-1">{t('modal.email')}</label>
                          <input id="edit_correo" defaultValue={travelerData.correo} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                        </div>
                        <div className="md:col-span-3 pt-2">
                          <h5 className="font-medium text-gray-700 mb-2">{t('modal.addressTitle')}</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-gray-600 mb-1">{t('modal.address')}</label>
                              <input id="edit_direccion" defaultValue={travelerData.direccion?.direccion || ''} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">{t('modal.postalCode')}</label>
                              <input id="edit_codigoPostal" defaultValue={travelerData.direccion?.codigoPostal || ''} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">{t('modal.country')} (ISO-3 o nombre)</label>
                              <input id="edit_pais" defaultValue={travelerData.direccion?.pais || ''} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">{t('modal.municipality')}</label>
                              <input id="edit_nombreMunicipio" defaultValue={travelerData.direccion?.nombreMunicipio || ''} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">{t('modal.municipalityCode')}</label>
                              <input id="edit_codigoMunicipio" defaultValue={travelerData.direccion?.codigoMunicipio || ''} className="border rounded px-2 py-1 w-full text-gray-900 font-medium" />
                            </div>
                          </div>
                        </div>
                        <div className="md:col-span-3 flex justify-end">
                          <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">{t('modal.saveChanges')}</button>
                        </div>
                      </form>
                    );
                  })()}
                </div>
              </div>

              {/* Status del envío al MIR */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">{t('modal.mirStatus')}</h4>
                <div className="bg-gray-50 border rounded-lg p-4">
                  {(() => {
                    const mirStatus = selectedRegistration?.data?.mir_status || {};
                    const hasMirData = mirStatus.lote || mirStatus.error || mirStatus.codigoComunicacion;
                    
                    if (!hasMirData) {
                      return (
                        <div className="flex items-center text-gray-600">
                          <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                          <span>{t('modal.mirNotSent')}</span>
                        </div>
                      );
                    }

                    if (mirStatus.error) {
                      return (
                        <div className="flex items-center text-red-600">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                          <div>
                            <span className="font-medium">{t('modal.mirError')}</span>
                            <p className="text-sm text-red-500 mt-1">{mirStatus.error}</p>
                            {mirStatus.lote && (
                              <p className="text-xs text-gray-500 mt-1">{t('modal.mirBatch')}: {mirStatus.lote}</p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (mirStatus.codigoComunicacion) {
                      return (
                        <div className="flex items-center text-green-600">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <div>
                            <span className="font-medium">{t('modal.mirSuccess')}</span>
                            <p className="text-sm text-green-600 mt-1">{t('modal.mirCode')}: {mirStatus.codigoComunicacion}</p>
                            {mirStatus.lote && (
                              <p className="text-xs text-gray-500 mt-1">{t('modal.mirBatch')}: {mirStatus.lote}</p>
                            )}
                            {mirStatus.fechaEnvio && (
                              <p className="text-xs text-gray-500 mt-1">{t('modal.mirSentDate')}: {new Date(mirStatus.fechaEnvio).toLocaleString(locale)}</p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (mirStatus.lote) {
                      return (
                        <div className="flex items-center text-yellow-600">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                          <div>
                            <span className="font-medium">{t('modal.mirPending')}</span>
                            <p className="text-sm text-yellow-600 mt-1">{t('modal.mirBatch')}: {mirStatus.lote}</p>
                            {mirStatus.fechaEnvio && (
                              <p className="text-xs text-gray-500 mt-1">{t('modal.mirSentDate')}: {new Date(mirStatus.fechaEnvio).toLocaleString(locale)}</p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="flex items-center text-gray-600">
                        <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                        <span>{t('modal.mirUnknown')}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedRegistration(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                {t('modal.close')}
              </button>
              <ExportButton
                solicitud={prepareSolicitudData(selectedRegistration)}
                onSuccess={() => {
                  alert(t('xmlGenerated'));
                  setSelectedRegistration(null);
                }}
                onError={(error) => alert(t('exportError') + '\n' + error)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 {t('instructions.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">{t('instructions.step1Title')}</h4>
            <p className="text-sm text-blue-700 mb-4">
              {t('instructions.step1Description')}
            </p>
            
            <h4 className="font-medium text-blue-800 mb-2">{t('instructions.step2Title')}</h4>
            <p className="text-sm text-blue-700">
              {t('instructions.step2Description')}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">{t('instructions.step3Title')}</h4>
            <p className="text-sm text-blue-700 mb-4">
              {t('instructions.step3Description')}
            </p>
            
            <h4 className="font-medium text-blue-800 mb-2">{t('instructions.step4Title')}</h4>
            <p className="text-sm text-blue-700">
              {t('instructions.step4Description')}
            </p>
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
