'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  Settings,
  AlertTriangle,
  Info,
  Copy,
  ExternalLink
} from 'lucide-react';

interface Property {
  id: number;
  property_name: string;
  tenant_id: string;
}

interface ExternalCalendar {
  id: number;
  property_id: number;
  calendar_name: string;
  calendar_type: string;
  calendar_url?: string;
  sync_frequency: number;
  last_sync_at?: string;
  sync_status: string;
  sync_error?: string;
  is_active: boolean;
  property_name?: string;
}

export default function IntegrationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [externalCalendars, setExternalCalendars] = useState<ExternalCalendar[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [tenantId, setTenantId] = useState<string>('');
  const [maxProperties, setMaxProperties] = useState<number>(6); // Valor por defecto, se actualizará desde el tenant
  
  // Formulario para agregar calendario externo
  const [formData, setFormData] = useState({
    property_id: '',
    calendar_name: '',
    calendar_type: 'ical',
    calendar_url: '',
    sync_frequency: 15
  });

  // Función para generar UUID v4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Obtener tenant_id desde el token
  useEffect(() => {
    const getTenantId = async () => {
      try {
        const response = await fetch('/api/tenants/me');
        if (response.ok) {
          const data = await response.json();
          if (data?.tenant?.id) {
            setTenantId(data.tenant.id);
          } else {
            // Fallback: el middleware inyecta el tenant_id por defecto
            setTenantId('870e589f-d313-4a5a-901f-f25fd4e7240a');
          }
        } else {
          // Fallback: el middleware inyecta el tenant_id por defecto
          setTenantId('870e589f-d313-4a5a-901f-f25fd4e7240a');
        }
      } catch (error) {
        console.error('Error obteniendo tenant ID:', error);
        // Fallback: el middleware inyecta el tenant_id por defecto
        setTenantId('870e589f-d313-4a5a-901f-f25fd4e7240a');
      }
    };
    getTenantId();
  }, []);

  // Cargar propiedades y calendarios
  useEffect(() => {
    if (!tenantId) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Obtener información del tenant para obtener el límite de propiedades
        const tenantRes = await fetch('/api/tenant', {
          headers: {
            'x-tenant-id': tenantId
          }
        });
        
        if (tenantRes.ok) {
          const tenantData = await tenantRes.json();
          // Buscar max_properties en tenant_integration_settings o usar max_rooms del tenant
          const tenantMaxProperties = tenantData.tenant?.max_rooms || 6;
          setMaxProperties(tenantMaxProperties);
        }
        
        // Obtener propiedades
        const propertiesRes = await fetch('/api/tenant/properties', {
          headers: {
            'x-tenant-id': tenantId
          }
        });
        
        if (propertiesRes.ok) {
          const propertiesData = await propertiesRes.json();
          if (propertiesData.success) {
            setProperties(propertiesData.properties || []);
          }
        }
        
        // Obtener calendarios externos
        const calendarsRes = await fetch('/api/tenant/external-calendars', {
          headers: {
            'x-tenant-id': tenantId
          }
        });
        
        if (calendarsRes.ok) {
          const calendarsData = await calendarsRes.json();
          if (calendarsData.success) {
            setExternalCalendars(calendarsData.calendars || []);
          }
        }
        
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [tenantId]);

  // Generar URL del iCal del sistema para una propiedad
  // El calendarId es determinista basado en el property_id para que siempre sea el mismo
  const getSystemICalUrl = (propertyId: number) => {
    // Usar un formato determinista: system-{propertyId}
    // Esto asegura que la URL siempre sea la misma para cada propiedad
    const calendarId = `system-${propertyId}`;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/api/public/ical/${propertyId}/${calendarId}`;
  };

  // Copiar URL al portapapeles
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('URL copiada al portapapeles');
    } catch (error) {
      console.error('Error copiando:', error);
    }
  };

  // Agregar calendario externo
  const handleAddExternalCalendar = async () => {
    if (!formData.property_id || !formData.calendar_name || !formData.calendar_type) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      const response = await fetch('/api/tenant/external-calendars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          property_id: parseInt(formData.property_id),
          calendar_name: formData.calendar_name,
          calendar_type: formData.calendar_type,
          calendar_url: formData.calendar_url || null,
          sync_frequency: formData.sync_frequency
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Calendario externo agregado correctamente');
        setShowAddForm(false);
        setFormData({
          property_id: '',
          calendar_name: '',
          calendar_type: 'ical',
          calendar_url: '',
          sync_frequency: 15
        });
        // Recargar calendarios
        const calendarsRes = await fetch('/api/tenant/external-calendars', {
          headers: { 'x-tenant-id': tenantId }
        });
        if (calendarsRes.ok) {
          const calendarsData = await calendarsRes.json();
          if (calendarsData.success) {
            setExternalCalendars(calendarsData.calendars || []);
          }
        }
      } else {
        alert(`Error: ${data.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error agregando calendario:', error);
      alert('Error al agregar calendario externo');
    }
  };

  // Eliminar calendario externo
  const handleDeleteCalendar = async (calendarId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este calendario?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tenant/external-calendars?id=${calendarId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Calendario eliminado correctamente');
        // Recargar calendarios
        const calendarsRes = await fetch('/api/tenant/external-calendars', {
          headers: { 'x-tenant-id': tenantId }
        });
        if (calendarsRes.ok) {
          const calendarsData = await calendarsRes.json();
          if (calendarsData.success) {
            setExternalCalendars(calendarsData.calendars || []);
          }
        }
      } else {
        alert(`Error: ${data.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error eliminando calendario:', error);
      alert('Error al eliminar calendario');
    }
  };

  // Sincronizar calendario
  const handleSyncCalendar = async (calendarId: number) => {
    try {
      const response = await fetch(`/api/tenant/external-calendars/${calendarId}/sync`, {
        method: 'POST',
        headers: {
          'x-tenant-id': tenantId
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Sincronización iniciada correctamente');
        // Recargar calendarios después de un momento
        setTimeout(() => {
          const calendarsRes = fetch('/api/tenant/external-calendars', {
            headers: { 'x-tenant-id': tenantId }
          });
          calendarsRes.then(res => res.json()).then(calendarsData => {
            if (calendarsData.success) {
              setExternalCalendars(calendarsData.calendars || []);
            }
          });
        }, 2000);
      } else {
        alert(`Error: ${data.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error sincronizando calendario:', error);
      alert('Error al sincronizar calendario');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integraciones de Calendario</h1>
          <p className="text-gray-800 mt-2">Gestiona los calendarios del sistema y sincroniza con OTAs</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Calendario Externo
        </Button>
      </div>

      {/* Información del plan */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription className="font-bold text-gray-900">
          <strong>Plan actual:</strong> Puedes gestionar hasta <strong>{maxProperties}</strong> propiedades/habitaciones según tu plan.
          Cada propiedad genera automáticamente un iCal único que puedes usar en Airbnb, Expedia y Booking.com.
          Además, puedes agregar hasta 5 calendarios externos adicionales por propiedad para sincronizar sus reservas.
        </AlertDescription>
      </Alert>

      {/* Formulario para agregar calendario externo */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-bold text-gray-900">Agregar Calendario Externo</CardTitle>
            <CardDescription className="font-semibold text-gray-800">
              Conecta calendarios de Airbnb, Expedia, Booking.com u otras OTAs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property_id" className="font-bold text-gray-900">Propiedad/Habitación *</Label>
                <select
                  id="property_id"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                >
                  <option value="">Selecciona una propiedad</option>
                  {properties.map(prop => (
                    <option key={prop.id} value={prop.id}>{prop.property_name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="calendar_name" className="font-bold text-gray-900">Nombre del Calendario *</Label>
                <Input
                  id="calendar_name"
                  placeholder="Ej: Airbnb - Habitación 1"
                  value={formData.calendar_name}
                  onChange={(e) => setFormData({ ...formData, calendar_name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="calendar_type" className="font-bold text-gray-900">Tipo de Calendario *</Label>
                <select
                  id="calendar_type"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.calendar_type}
                  onChange={(e) => setFormData({ ...formData, calendar_type: e.target.value })}
                >
                  <option value="ical">iCal Feed</option>
                  <option value="google">Google Calendar</option>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking.com</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="sync_frequency" className="font-bold text-gray-900">Frecuencia de Sincronización (minutos)</Label>
                <Input
                  id="sync_frequency"
                  type="number"
                  min="5"
                  max="1440"
                  value={formData.sync_frequency}
                  onChange={(e) => setFormData({ ...formData, sync_frequency: parseInt(e.target.value) || 15 })}
                />
              </div>
              
              {formData.calendar_type === 'ical' && (
                <div className="col-span-2">
                  <Label htmlFor="calendar_url" className="font-bold text-gray-900">URL del Calendario iCal *</Label>
                  <Input
                    id="calendar_url"
                    placeholder="https://..."
                    value={formData.calendar_url}
                    onChange={(e) => setFormData({ ...formData, calendar_url: e.target.value })}
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAddExternalCalendar} className="bg-blue-600 hover:bg-blue-700">
                Agregar Calendario
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="font-bold text-gray-900">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendarios del Sistema (iCals generados automáticamente) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-bold text-gray-900">
            <Calendar className="w-5 h-5" />
            Calendarios del Sistema
          </CardTitle>
          <CardDescription className="font-semibold text-gray-800">
            Cada propiedad genera automáticamente un iCal único que puedes usar en tus OTAs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <div className="text-center py-8 font-bold text-gray-900">
              No tienes propiedades configuradas. Crea una propiedad primero.
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map(property => {
                const icalUrl = getSystemICalUrl(property.id);
                return (
                  <div key={property.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2">{property.property_name}</h4>
                        <p className="text-sm text-gray-800 mb-3">
                          URL del iCal del sistema para sincronizar con OTAs:
                        </p>
                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-md">
                          <code className="flex-1 text-xs break-all">{icalUrl}</code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(icalUrl)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(icalUrl, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-700 mt-2">
                          Copia esta URL y úsala en Airbnb, Expedia, Booking.com u otras OTAs para sincronizar tus reservas directas.
                        </p>
                      </div>
                      <div className="ml-4">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendarios Externos */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-bold text-gray-900">
            <Settings className="w-5 h-5" />
            Calendarios Externos
          </CardTitle>
          <CardDescription className="font-semibold text-gray-800">
            Calendarios de OTAs que sincronizan con tu sistema para bloquear fechas automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {externalCalendars.length === 0 ? (
            <div className="text-center py-8 font-bold text-gray-900">
              No tienes calendarios externos configurados. Agrega uno para sincronizar con OTAs.
            </div>
          ) : (
            <div className="space-y-4">
              {externalCalendars.map(calendar => (
                <div key={calendar.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{calendar.calendar_name}</h4>
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {calendar.property_name || `Propiedad ${calendar.property_id}`}
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          {calendar.calendar_type}
                        </span>
                      </div>
                      
                      {calendar.calendar_url && (
                        <p className="text-sm text-gray-800 mb-2">
                          <strong>URL:</strong> <code className="text-xs">{calendar.calendar_url}</code>
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-800">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Sincroniza cada {calendar.sync_frequency} min
                        </span>
                        {calendar.last_sync_at && (
                          <span>
                            Última sincronización: {new Date(calendar.last_sync_at).toLocaleString('es-ES')}
                          </span>
                        )}
                      </div>
                      
                      {calendar.sync_status === 'error' && calendar.sync_error && (
                        <Alert className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Error de sincronización:</strong> {calendar.sync_error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSyncCalendar(calendar.id)}
                        disabled={calendar.sync_status === 'syncing'}
                      >
                        <RefreshCw className={`w-4 h-4 ${calendar.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCalendar(calendar.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {calendar.sync_status === 'syncing' && (
                    <div className="mt-2 text-sm text-blue-600">
                      Sincronizando...
                    </div>
                  )}
                  {calendar.sync_status === 'success' && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Última sincronización exitosa
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-bold text-gray-900">
            <Info className="w-5 h-5" />
            Información sobre Integraciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Cómo funciona:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm font-semibold text-gray-900">
              <li><strong>Calendarios del Sistema:</strong> Cada propiedad genera automáticamente un iCal único con todas tus reservas directas. Usa esta URL en tus OTAs para que bloqueen automáticamente las fechas cuando tengas reservas directas.</li>
              <li><strong>Calendarios Externos:</strong> Agrega los iCals de tus OTAs (Airbnb, Expedia, Booking) para que el sistema bloquee automáticamente las fechas cuando tengas reservas en esas plataformas.</li>
              <li><strong>Sincronización:</strong> Los calendarios externos se sincronizan automáticamente según la frecuencia configurada. Puedes sincronizar manualmente en cualquier momento.</li>
              <li><strong>Límites:</strong> Tu plan permite hasta {maxProperties} propiedades/habitaciones. Cada propiedad puede tener un calendario del sistema y hasta 5 calendarios externos adicionales.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
