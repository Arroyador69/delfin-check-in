'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  ExternalLink,
  Settings,
  AlertTriangle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface ExternalCalendar {
  id: number;
  tenant_id: string;
  property_id: number;
  calendar_name: string;
  calendar_type: 'ical' | 'google' | 'airbnb' | 'booking';
  calendar_url?: string;
  sync_frequency: number;
  last_sync_at?: string;
  sync_status: 'pending' | 'syncing' | 'success' | 'error';
  sync_error?: string;
  is_active: boolean;
  property_name?: string;
}

interface CalendarEvent {
  id: number;
  external_calendar_id: number;
  event_title?: string;
  start_date: string;
  end_date: string;
  is_blocked: boolean;
  event_type: string;
  external_source: string;
}

interface TenantIntegrationSettings {
  max_properties: number;
  allowed_calendar_types: string[];
  auto_sync_enabled: boolean;
  sync_conflict_resolution: string;
}

export default function IntegrationsSettingsPage() {
  const { data: session } = useSession();
  const [calendars, setCalendars] = useState<ExternalCalendar[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [integrationSettings, setIntegrationSettings] = useState<TenantIntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddCalendar, setShowAddCalendar] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<ExternalCalendar | null>(null);

  // Formulario para nuevo calendario
  const [newCalendar, setNewCalendar] = useState({
    property_id: '',
    calendar_name: '',
    calendar_type: 'ical' as const,
    calendar_url: '',
    sync_frequency: 15,
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

    const loadData = async () => {
      try {
      setLoading(true);
      
      // Cargar calendarios externos
      const calendarsResponse = await fetch('/api/tenant/external-calendars', {
        headers: {
          'x-tenant-id': session?.user?.id || 'default'
        }
      });
      
      if (calendarsResponse.ok) {
        const calendarsData = await calendarsResponse.json();
        setCalendars(calendarsData.calendars || []);
      }

      // Cargar propiedades
      const propertiesResponse = await fetch('/api/tenant/properties', {
        headers: {
          'x-tenant-id': session?.user?.id || 'default'
        }
      });
      
      if (propertiesResponse.ok) {
        const propertiesData = await propertiesResponse.json();
        setProperties(propertiesData || []);
      }

      // Cargar configuración de integraciones
      const settingsResponse = await fetch('/api/tenant/integration-settings', {
        headers: {
          'x-tenant-id': session?.user?.id || 'default'
        }
      });
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setIntegrationSettings(settingsData.settings);
      }

      } catch (error) {
        console.error('Error cargando datos:', error);
      toast.error('Error cargando datos de integraciones');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCalendar = async () => {
    if (!newCalendar.property_id || !newCalendar.calendar_name) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/tenant/external-calendars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session?.user?.id || 'default'
        },
        body: JSON.stringify(newCalendar)
      });

      if (response.ok) {
        toast.success('Calendario agregado correctamente');
        setShowAddCalendar(false);
        setNewCalendar({
          property_id: '',
          calendar_name: '',
          calendar_type: 'ical',
          calendar_url: '',
          sync_frequency: 15,
          is_active: true
        });
    loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error agregando calendario');
      }
    } catch (error) {
      console.error('Error agregando calendario:', error);
      toast.error('Error agregando calendario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncCalendar = async (calendarId: number) => {
    try {
      const response = await fetch(`/api/tenant/external-calendars/${calendarId}/sync`, {
        method: 'POST',
        headers: {
          'x-tenant-id': session?.user?.id || 'default'
        }
      });

      if (response.ok) {
        toast.success('Sincronización iniciada');
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error iniciando sincronización');
      }
    } catch (error) {
      console.error('Error sincronizando calendario:', error);
      toast.error('Error sincronizando calendario');
    }
  };

  const handleDeleteCalendar = async (calendarId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este calendario?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tenant/external-calendars/${calendarId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': session?.user?.id || 'default'
        }
      });

      if (response.ok) {
        toast.success('Calendario eliminado correctamente');
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error eliminando calendario');
      }
    } catch (error) {
      console.error('Error eliminando calendario:', error);
      toast.error('Error eliminando calendario');
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'syncing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCalendarTypeIcon = (type: string) => {
    switch (type) {
      case 'ical':
        return '📅';
      case 'google':
        return '🔵';
      case 'airbnb':
        return '🏠';
      case 'booking':
        return '📖';
      default:
        return '📅';
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
          <p className="text-gray-600 mt-2">Gestiona la sincronización de calendarios externos</p>
        </div>
        <Button
          onClick={() => setShowAddCalendar(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Calendario
        </Button>
        </div>
        
      {/* Información del plan */}
      {integrationSettings && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Plan actual:</strong> Puedes gestionar hasta <strong>{integrationSettings.max_properties}</strong> propiedades.
            Tipos de calendario permitidos: {integrationSettings.allowed_calendar_types.join(', ')}.
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de calendarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {calendars.map((calendar) => (
          <Card key={calendar.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
            <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">{getCalendarTypeIcon(calendar.calendar_type)}</span>
                    {calendar.calendar_name}
                  </CardTitle>
                  <CardDescription>
                    {calendar.property_name} • {calendar.calendar_type.toUpperCase()}
                  </CardDescription>
            </div>
                <div className="flex items-center gap-2">
                  <Badge className={getSyncStatusColor(calendar.sync_status)}>
                    {getSyncStatusIcon(calendar.sync_status)}
                    <span className="ml-1">{calendar.sync_status}</span>
                  </Badge>
                  <Switch
                    checked={calendar.is_active}
                    onCheckedChange={async () => {
                      // Toggle active status
                      try {
                        const response = await fetch(`/api/tenant/external-calendars/${calendar.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-tenant-id': session?.user?.id || 'default'
                          },
                          body: JSON.stringify({ is_active: !calendar.is_active })
                        });
                        
                        if (response.ok) {
                          loadData();
                        }
                      } catch (error) {
                        console.error('Error actualizando calendario:', error);
                      }
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {calendar.calendar_url && (
                  <div>
                    <Label className="text-sm font-medium">URL del calendario:</Label>
                    <p className="text-sm text-gray-600 break-all">{calendar.calendar_url}</p>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span>Sincronización cada {calendar.sync_frequency} minutos</span>
                  {calendar.last_sync_at && (
                    <span>Última sync: {new Date(calendar.last_sync_at).toLocaleString()}</span>
                  )}
                </div>

                {calendar.sync_error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{calendar.sync_error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSyncCalendar(calendar.id)}
                    disabled={calendar.sync_status === 'syncing'}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Sincronizar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingCalendar(calendar)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCalendar(calendar.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal para agregar calendario */}
      {showAddCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Agregar Calendario Externo</CardTitle>
              <CardDescription>
                Conecta un calendario externo para sincronizar disponibilidad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="property">Propiedad</Label>
                <Select
                  value={newCalendar.property_id}
                  onValueChange={(value) => setNewCalendar({ ...newCalendar, property_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una propiedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.property_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="calendar_name">Nombre del calendario</Label>
                <Input
                  id="calendar_name"
                  value={newCalendar.calendar_name}
                  onChange={(e) => setNewCalendar({ ...newCalendar, calendar_name: e.target.value })}
                  placeholder="Ej: Airbnb Reservas"
                />
            </div>

              <div>
                <Label htmlFor="calendar_type">Tipo de calendario</Label>
                <Select
                  value={newCalendar.calendar_type}
                  onValueChange={(value: any) => setNewCalendar({ ...newCalendar, calendar_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ical">iCal Feed</SelectItem>
                    <SelectItem value="google">Google Calendar</SelectItem>
                    <SelectItem value="airbnb">Airbnb</SelectItem>
                    <SelectItem value="booking">Booking.com</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newCalendar.calendar_type === 'ical' && (
                <div>
                  <Label htmlFor="calendar_url">URL del calendario iCal</Label>
                  <Input
                    id="calendar_url"
                    value={newCalendar.calendar_url}
                    onChange={(e) => setNewCalendar({ ...newCalendar, calendar_url: e.target.value })}
                    placeholder="https://calendar.example.com/feed.ics"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="sync_frequency">Frecuencia de sincronización (minutos)</Label>
                <Input
                  id="sync_frequency"
                  type="number"
                  value={newCalendar.sync_frequency}
                  onChange={(e) => setNewCalendar({ ...newCalendar, sync_frequency: parseInt(e.target.value) })}
                  min="5"
                  max="1440"
                />
            </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={newCalendar.is_active}
                  onCheckedChange={(checked) => setNewCalendar({ ...newCalendar, is_active: checked })}
                />
                <Label htmlFor="is_active">Calendario activo</Label>
          </div>
            </CardContent>
            <CardContent className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddCalendar(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddCalendar}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Agregando...' : 'Agregar'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Información adicional */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Información sobre Integraciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Tipos de calendario soportados:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li><strong>iCal Feed:</strong> Compatible con Airbnb, Booking.com, Google Calendar y otros</li>
              <li><strong>Google Calendar:</strong> Sincronización directa con Google Calendar API</li>
              <li><strong>Airbnb:</strong> Integración con Airbnb Calendar Sync</li>
              <li><strong>Booking.com:</strong> Conecta con Booking.com Calendar</li>
            </ul>
      </div>

          <div>
            <h4 className="font-semibold mb-2">Cómo funciona:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Los eventos externos bloquean automáticamente las fechas en tu propiedad</li>
              <li>Las reservas directas se sincronizan con tus calendarios externos</li>
              <li>Puedes configurar la frecuencia de sincronización según tus necesidades</li>
              <li>Los conflictos se resuelven según tu configuración preferida</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}