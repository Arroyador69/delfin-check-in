'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
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
  const t = useTranslations('settings.integrations');
  const locale = useLocale();
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
          }
        }
      } catch (error) {
        console.error('Error obteniendo tenant ID:', error);
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
      alert(`✅ ${t('urlCopied')}`);
    } catch (error) {
      console.error('Error copiando:', error);
    }
  };

  // Agregar calendario externo
  const handleAddExternalCalendar = async () => {
    if (!formData.property_id || !formData.calendar_name || !formData.calendar_url) {
      alert(`⚠️ ${t('requiredFields')}`);
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
          calendar_type: 'ical', // Siempre usar 'ical' ya que todos los calendarios externos son iCal
          calendar_url: formData.calendar_url,
          sync_frequency: formData.sync_frequency
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${t('addCalendarSuccess')}`);
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
        alert(`❌ ${t('errorUnknown')}: ${data.error || t('errorUnknown')}`);
      }
    } catch (error) {
      console.error('Error agregando calendario:', error);
      alert(`❌ ${t('errorUnknown')}`);
    }
  };

  // Eliminar calendario externo
  const handleDeleteCalendar = async (calendarId: number) => {
    if (!confirm(t('deleteConfirm'))) {
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
        alert(`✅ ${t('deleteSuccess')}`);
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
        alert(`❌ ${data.error || t('errorUnknown')}`);
      }
    } catch (error) {
      console.error('Error eliminando calendario:', error);
      alert(`❌ ${t('deleteError')}`);
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
        alert(`✅ ${t('syncSuccess')}`);
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
        alert(`❌ ${data.error || t('errorUnknown')}`);
      }
    } catch (error) {
      console.error('Error sincronizando calendario:', error);
      alert(`❌ ${t('syncError')}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800 text-lg font-semibold">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-2 sm:mb-4">
            <span className="text-4xl sm:text-6xl mr-2 sm:mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📅</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('calendarsTitle')}
            </span>
          </h1>
          <p className="text-gray-800 text-sm sm:text-lg font-medium">{t('calendarsSubtitle')}</p>
        </div>

        {/* Información del plan */}
        <div className="bg-white border border-blue-200 rounded-xl p-4 sm:p-6 mb-6 shadow-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold text-gray-900 text-sm sm:text-base">
                <strong className="text-blue-700">📊 {t('planInfo', { max: maxProperties })}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Botón Agregar Calendario */}
        <div className="flex justify-center mb-6">
          <Button 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2 sm:gap-3 font-semibold"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-sm sm:text-base">{showAddForm ? t('hideForm') : t('addExternalCalendar')}</span>
          </Button>
        </div>

        {/* Formulario para agregar calendario externo */}
        {showAddForm && (
          <Card className="mb-6 bg-white shadow-xl border border-blue-200 rounded-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
              <CardTitle className="font-bold text-gray-900 flex items-center gap-2 text-xl sm:text-2xl">
                <span className="text-2xl sm:text-3xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>➕</span>
                {t('addExternalCalendar')}
              </CardTitle>
              <CardDescription className="font-semibold text-gray-900 text-sm sm:text-base">
                {t('addFormDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="property_id" className="font-semibold text-gray-900 mb-2 block text-sm sm:text-base">
                    🏠 {t('propertyLabel')}
                  </Label>
                  <select
                    id="property_id"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                  >
                    <option value="">{t('selectProperty')}</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.property_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="calendar_name" className="font-semibold text-gray-900 mb-2 block text-sm sm:text-base">
                    📋 {t('calendarNameLabel')}
                  </Label>
                  <Input
                    id="calendar_name"
                    placeholder={t('calendarNamePlaceholder')}
                    value={formData.calendar_name}
                    onChange={(e) => setFormData({ ...formData, calendar_name: e.target.value })}
                    className="rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
                
                <div>
                  <Label htmlFor="sync_frequency" className="font-semibold text-gray-900 mb-2 block text-sm sm:text-base">
                    ⏱️ {t('syncFrequencyLabel')}
                  </Label>
                  <Input
                    id="sync_frequency"
                    type="number"
                    min="5"
                    max="1440"
                    value={formData.sync_frequency}
                    onChange={(e) => setFormData({ ...formData, sync_frequency: parseInt(e.target.value) || 15 })}
                    className="rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="calendar_url" className="font-semibold text-gray-900 mb-2 block text-sm sm:text-base">
                    🌐 {t('calendarUrlLabel')}
                  </Label>
                  <Input
                    id="calendar_url"
                    placeholder={t('calendarUrlPlaceholder')}
                    value={formData.calendar_url}
                    onChange={(e) => setFormData({ ...formData, calendar_url: e.target.value })}
                    className="rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)} 
                  className="font-semibold text-gray-900 border-gray-300 rounded-xl hover:bg-gray-50 px-6 py-3"
                >
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleAddExternalCalendar} 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 px-6 py-3 font-semibold"
                >
                  ✨ {t('addCalendarButton')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendarios del Sistema (iCals generados automáticamente) */}
        <Card className="mb-6 bg-white shadow-xl border border-blue-200 rounded-xl">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-xl">
            <CardTitle className="flex items-center gap-2 font-bold text-gray-900 text-xl sm:text-2xl">
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
              <span className="text-2xl sm:text-3xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📆</span>
              {t('systemCalendarsTitle')}
            </CardTitle>
            <CardDescription className="font-semibold text-gray-900 text-sm sm:text-base">
              {t('systemCalendarsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {properties.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Calendar className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">{t('noProperties')}</h3>
                <p className="text-gray-800 text-sm sm:text-base font-medium">{t('noPropertiesHint')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {properties.map(property => {
                  const icalUrl = getSystemICalUrl(property.id);
                  return (
                    <div key={property.id} className="border-2 border-blue-200 rounded-xl p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-lg transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg sm:text-xl mb-2 sm:mb-3 text-gray-900 flex items-center gap-2">
                            <span className="text-xl sm:text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏠</span>
                            {property.property_name}
                          </h4>
                          <p className="text-sm sm:text-base text-gray-900 mb-3 font-semibold">
                            {t('icalUrlLabel')}
                          </p>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-3 sm:p-4 rounded-xl border border-blue-200 shadow-sm">
                            <code className="flex-1 text-xs sm:text-sm break-all p-2 bg-gray-50 rounded-lg font-mono text-gray-900">{icalUrl}</code>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(icalUrl)}
                                className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700 rounded-lg transition-all hover:scale-110"
                                title={t('copyUrl')}
                              >
                                <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(icalUrl, '_blank')}
                                className="bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-700 rounded-lg transition-all hover:scale-110"
                                title={t('openInNewTab')}
                              >
                                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-800 mt-3 font-semibold">
                            💡 {t('copyHint')}
                          </p>
                        </div>
                        <div className="ml-4">
                          <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
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
        <Card className="mb-6 bg-white shadow-xl border border-blue-200 rounded-xl">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl">
            <CardTitle className="flex items-center gap-2 font-bold text-gray-900 text-xl sm:text-2xl">
              <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
              <span className="text-2xl sm:text-3xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🔗</span>
              {t('externalCalendarsTitle')}
            </CardTitle>
            <CardDescription className="font-semibold text-gray-900 text-sm sm:text-base">
              {t('externalCalendarsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {externalCalendars.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Settings className="w-12 h-12 text-purple-600" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">{t('noExternalCalendars')}</h3>
                <p className="text-gray-800 text-sm sm:text-base font-medium">{t('noExternalCalendarsHint')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {externalCalendars.map(calendar => (
                  <div key={calendar.id} className="border-2 border-purple-200 rounded-xl p-4 sm:p-6 bg-gradient-to-r from-purple-50 to-pink-50 hover:shadow-lg transition-all duration-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h4 className="font-bold text-lg sm:text-xl text-gray-900">{calendar.calendar_name}</h4>
                          <span className="px-3 py-1 text-xs sm:text-sm bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full font-semibold border border-blue-200">
                            🏠 {calendar.property_name || t('propertyShort', { id: calendar.property_id })}
                          </span>
                          <span className="px-3 py-1 text-xs sm:text-sm bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-full font-semibold border border-gray-300">
                            {calendar.calendar_type}
                          </span>
                        </div>
                        
                        {calendar.calendar_url && (
                          <p className="text-sm sm:text-base text-gray-900 mb-3 font-semibold">
                            <strong>🌐 URL:</strong> <code className="text-xs sm:text-sm bg-white px-2 py-1 rounded border border-gray-200 text-gray-900">{calendar.calendar_url}</code>
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base text-gray-800">
                          <span className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold">{t('syncEveryMin', { min: calendar.sync_frequency })}</span>
                          </span>
                          {calendar.last_sync_at && (
                            <span className="bg-white px-3 py-2 rounded-lg border border-gray-200 font-semibold text-gray-900">
                              📅 {t('lastSync')} {new Date(calendar.last_sync_at).toLocaleString(locale)}
                            </span>
                          )}
                        </div>
                        
                        {calendar.sync_status === 'error' && calendar.sync_error && (
                          <Alert className="mt-4 bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <AlertDescription className="font-semibold text-red-800">
                              <strong>⚠️ {t('syncErrorLabel')}</strong> {calendar.sync_error}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSyncCalendar(calendar.id)}
                          disabled={calendar.sync_status === 'syncing'}
                          className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700 rounded-lg transition-all hover:scale-110 disabled:opacity-50"
                          title={t('syncButtonTitle')}
                        >
                          <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${calendar.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCalendar(calendar.id)}
                          className="bg-red-50 hover:bg-red-100 border-red-300 text-red-700 rounded-lg transition-all hover:scale-110"
                          title={t('deleteButtonTitle')}
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                      </div>
                    </div>
                    
                    {calendar.sync_status === 'syncing' && (
                      <div className="mt-3 flex items-center gap-2 text-sm sm:text-base text-blue-600 font-semibold">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>🔄 {t('syncing')}</span>
                      </div>
                    )}
                    {calendar.sync_status === 'success' && (
                      <div className="mt-3 flex items-center gap-2 text-sm sm:text-base text-green-600 font-semibold">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>✅ {t('lastSyncSuccess')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card className="mt-8 bg-white shadow-xl border border-blue-200 rounded-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-xl">
            <CardTitle className="flex items-center gap-2 font-bold text-gray-900 text-xl sm:text-2xl">
              <Info className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
              <span className="text-2xl sm:text-3xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>ℹ️</span>
              {t('infoTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <h4 className="font-bold text-gray-900 mb-4 text-lg sm:text-xl flex items-center gap-2">
                <span className="text-xl sm:text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>💡</span>
                {t('howItWorks')}
              </h4>
              <ul className="list-disc list-inside space-y-3 text-sm sm:text-base font-semibold text-gray-800">
                <li className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                  <strong className="text-blue-700">📆 {t('infoSystemCal')}</strong>
                </li>
                <li className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                  <strong className="text-purple-700">🔗 {t('infoExternalCal')}</strong>
                </li>
                <li className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                  <strong className="text-green-700">🔄 {t('infoSync')}</strong>
                </li>
                <li className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg border border-yellow-200">
                  <strong className="text-orange-700">📊 {t('infoLimits', { max: maxProperties })}</strong>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
