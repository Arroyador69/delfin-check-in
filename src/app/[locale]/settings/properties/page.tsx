'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { UnitLimitUsageBanner } from '@/components/tenant/UnitLimitUsageBanner';
import { Plus, Edit, Trash2, Camera, Euro, Users, Bed, Bath, Upload, X, Image as ImageIcon, Copy, Link as LinkIcon } from 'lucide-react';
import { TenantProperty, CreatePropertyRequest } from '@/lib/direct-reservations-types';

const AMENITY_KEYS = ['wifi', 'airConditioning', 'heating', 'kitchen', 'washingMachine', 'dryer', 'pool', 'garden', 'terrace', 'parking', 'elevator', 'gym', 'spa', 'reception24h', 'dailyCleaning'] as const;

export default function PropertiesManagement() {
  const t = useTranslations('settings.properties');
  const [properties, setProperties] = useState<TenantProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<TenantProperty | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<{ room_id: string; room_name: string; property_id: number|null; property_name: string|null; is_placeholder: boolean }[]>([]);
  const [formData, setFormData] = useState<CreatePropertyRequest>({
    property_name: '',
    description: '',
    photos: [],
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: [],
    base_price: 50,
    cleaning_fee: 0,
    security_deposit: 0,
    minimum_nights: 1,
    maximum_nights: 30,
    availability_rules: {}
  });

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

  // Cargar propiedades al montar el componente
  useEffect(() => {
    if (tenantId) {
      loadProperties();
    }
  }, [tenantId]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenant/properties');
      
      const data = await response.json();
      if (data.success) {
        setProperties(data.properties);
      }
      // Cargar slots para el formulario (solo placeholders y los mapeados)
      const slotsRes = await fetch('/api/tenant/property-slots', {
        headers: tenantId ? { 'x-tenant-id': tenantId } : undefined
      })
      const slotsData = await slotsRes.json()
      if (slotsRes.ok && slotsData.success) {
        setSlots(slotsData.slots || [])
      }
    } catch (error) {
      console.error('Error cargando propiedades:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para copiar al portapapeles
  const copyToClipboard = async (text: string, propertyId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(propertyId);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      console.error('Error copiando al portapapeles:', error);
      alert(t('copyError'));
    }
  };

  // Generar enlace de reserva directa
  const getBookingLink = (propertyId: number) => {
    if (!tenantId) return '';
    // Usar el subdominio público de reservas
    return `https://book.delfincheckin.com/${tenantId}/${propertyId}`;
  };

  // Función para convertir imágenes a base64
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const newPhotos: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
          alert(t('invalidImage', { name: file.name }));
          continue;
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(t('imageTooBig', { name: file.name }));
          continue;
        }

        // Convertir a base64
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newPhotos.push(base64);
      }

      setFormData({
        ...formData,
        photos: [...(formData.photos || []), ...newPhotos]
      });

      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error procesando imágenes:', error);
      alert(t('processImagesError'));
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    const newPhotos = [...(formData.photos || [])];
    newPhotos.splice(index, 1);
    setFormData({ ...formData, photos: newPhotos });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingProperty 
        ? `/api/tenant/properties?id=${editingProperty.id}`
        : '/api/tenant/properties';
      
      const method = editingProperty ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        amenities: (formData.amenities || []).map((a) =>
          AMENITY_KEYS.includes(a as typeof AMENITY_KEYS[number]) ? t(`amenitiesList.${a}`) : a
        )
      };
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadProperties();
        setShowForm(false);
        setEditingProperty(null);
        resetForm();
        alert(editingProperty ? t('updateSuccess') : t('saveSuccess'));
      } else {
        const parts = [data.error];
        if (data.suggestion) parts.push(data.suggestion);
        if (data.current_usage != null && data.max_allowed != null) {
          parts.push(`Uso actual: ${data.current_usage} / ${data.max_allowed} unidades.`);
        }
        if (data.upgrade_href) {
          parts.push(`Abre ${window.location.origin}/${locale}${data.upgrade_href} para cambiar de plan.`);
        }
        alert(parts.filter(Boolean).join('\n\n'));
      }
    } catch (error) {
      console.error('Error guardando propiedad:', error);
      alert(t('saveError'));
    }
  };

  const handleEdit = (property: TenantProperty) => {
    setEditingProperty(property);
    // Normalize amenities: API may return keys or legacy Spanish labels; keep as-is for display
    const amenities = property.amenities || [];
    setFormData({
      property_name: property.property_name,
      description: property.description || '',
      photos: property.photos || [],
      max_guests: property.max_guests,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      amenities: Array.isArray(amenities) ? amenities : [],
      base_price: property.base_price,
      cleaning_fee: property.cleaning_fee,
      security_deposit: property.security_deposit,
      minimum_nights: property.minimum_nights,
      maximum_nights: property.maximum_nights,
      availability_rules: property.availability_rules || {}
    });
    setShowForm(true);
  };

  const handleDelete = async (propertyId: number) => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }
    
    try {
      const response = await fetch(`/api/tenant/properties?id=${propertyId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadProperties();
        alert(t('deleteSuccess'));
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error eliminando propiedad:', error);
      alert(t('errorDelete'));
    }
  };

  const resetForm = () => {
    setFormData({
      property_name: '',
      description: '',
      photos: [],
      max_guests: 2,
      bedrooms: 1,
      bathrooms: 1,
      amenities: [],
      base_price: 50,
      cleaning_fee: 0,
      security_deposit: 0,
      minimum_nights: 1,
      maximum_nights: 30,
      availability_rules: {}
    });
  };

  const toggleAmenity = (amenityKey: string) => {
    const label = t(`amenitiesList.${amenityKey}`);
    const current = formData.amenities || [];
    const isChecked = current.includes(amenityKey) || current.includes(label);
    const withoutThis = current.filter((a) => a !== amenityKey && a !== label);
    const newAmenities = isChecked ? withoutThis : [...withoutThis, amenityKey];
    setFormData({ ...formData, amenities: newAmenities });
  };

  const isAmenityChecked = (key: string) => {
    const list = formData.amenities || [];
    return list.includes(key) || list.includes(t(`amenitiesList.${key}`));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">{t('loading')}</p>
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
            <span className="text-4xl sm:text-6xl mr-2 sm:mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏠</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('pageTitle')}
            </span>
          </h1>
          <p className="text-gray-600 text-sm sm:text-lg">{t('subtitle')}</p>
        </div>

        <div className="mb-8 max-w-3xl mx-auto">
          <UnitLimitUsageBanner upgradeHref={`/${locale}/upgrade-plan`} />
        </div>

        {/* Botón Nueva Propiedad */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => {
              resetForm();
              setEditingProperty(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 flex items-center gap-2 sm:gap-3 font-semibold text-sm sm:text-base"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>{t('newProperty')}</span>
          </button>
        </div>

        {/* Lista de propiedades */}
        {properties.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center border border-blue-200">
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Camera className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">{t('noProperties')}</h3>
            <p className="text-gray-600 text-sm sm:text-base mb-6">{t('noPropertiesDescription')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {properties.map((property) => (
              <div key={property.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-blue-200 hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                {property.photos && property.photos.length > 0 ? (
                  <img 
                    src={property.photos[0]} 
                    alt={property.property_name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <Camera className="w-16 h-16 text-blue-400" />
                  </div>
                )}
                
                <div className="p-4 sm:p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {property.property_name}
                  </h3>
                  
                  {property.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {property.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-500 mb-4 flex-wrap">
                    <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{property.max_guests}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-lg">
                      <Bed className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg">
                      <Bath className="w-4 h-4 text-indigo-600" />
                      <span className="font-medium">{property.bathrooms}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1 text-lg sm:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      <Euro className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      {property.base_price}{t('pricePerNight')}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(property)}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
                        title={t('editProperty')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(property.id)}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
                        title={t('deleteProperty')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      property.is_active 
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                        : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200'
                    }`}>
                      {property.is_active ? `✅ ${t('active')}` : `❌ ${t('inactive')}`}
                    </span>
                  </div>

                  {/* Enlace de reserva directa */}
                  {property.is_active && tenantId && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-blue-600" />
                        {t('bookingLink')}
                      </label>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <input
                          type="text"
                          readOnly
                          value={getBookingLink(property.id)}
                          className="flex-1 text-xs font-mono text-gray-700 bg-transparent border-none outline-none"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={() => copyToClipboard(getBookingLink(property.id), property.id)}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            copiedLink === property.id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                          title={t('copyLink')}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      {copiedLink === property.id && (
                        <p className="text-xs text-green-600 mt-1 font-medium">✓ {t('linkCopied')}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario de nueva/edición propiedad */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-blue-200">
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold">
                    <span className="text-3xl sm:text-4xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>
                      {editingProperty ? '✏️' : '✨'}
                    </span>
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {editingProperty ? t('editProperty') : t('newProperty')}
                    </span>
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingProperty(null);
                      resetForm();
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Subida de Imágenes */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                    <label className="block text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      <span>{t('form.images')}</span>
                      <span className="text-xs sm:text-sm text-gray-500 font-normal">{t('form.imagesLimit')}</span>
                    </label>
                    
                    {/* Vista previa de imágenes */}
                    {formData.photos && formData.photos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
                        {formData.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={photo} 
                              alt={`Imagen ${index + 1}`}
                              className="w-full h-32 sm:h-40 object-cover rounded-lg border-2 border-blue-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Botón de subida */}
                    <div className="flex justify-center">
                      <label className="cursor-pointer">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImages}
                        />
                        <div className={`flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-white border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 transition-all duration-200 ${uploadingImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}`}>
                          {uploadingImages ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              <span className="text-blue-600 font-medium text-sm sm:text-base">{t('form.uploading')}</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                              <span className="text-blue-600 font-medium text-sm sm:text-base">
                                {formData.photos && formData.photos.length > 0 ? t('form.addImages') : t('form.uploadImages')}
                              </span>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Selector de Slot (Room) */}
                  {!editingProperty && (
                    <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-xl sm:text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🧩</span>
                        {t('form.selectSlot')}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">{t('form.selectSlotDescription')}</p>
                      <select
                        required
                        value={(formData as any).room_id || ''}
                        onChange={(e)=> setFormData({ ...formData, room_id: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        <option value="" disabled>{t('form.selectSlotPlaceholder')}</option>
                        {slots.map((s, idx) => (
                          <option key={s.room_id || `slot-${idx}`} value={s.room_id}>
                            {s.property_name || s.room_name} {s.property_id ? '' : t('form.slotNotConfigured')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Información básica */}
                  <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📝</span>
                      {t('form.basicInfo')}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                          {t('form.propertyName')} *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.property_name}
                          onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder={t('form.propertyNamePlaceholder')}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                          {t('form.basePrice')} *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          step="0.01"
                          value={formData.base_price}
                          onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 sm:mt-6">
                      <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                        {t('form.description')}
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                        placeholder={t('form.descriptionPlaceholder')}
                      />
                    </div>
                  </div>
                  
                  {/* Características */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200 shadow-sm">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏡</span>
                      {t('form.characteristics')}
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Users className="w-4 h-4 inline mr-1" />
                          {t('form.maxGuests')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.max_guests}
                          onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Bed className="w-4 h-4 inline mr-1" />
                          {t('form.bedrooms')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.bedrooms}
                          onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Bath className="w-4 h-4 inline mr-1" />
                          {t('form.bathrooms')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="0.5"
                          value={formData.bathrooms}
                          onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          🌙 {t('form.minNights')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.minimum_nights}
                          onChange={(e) => setFormData({ ...formData, minimum_nights: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Tarifas adicionales */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Euro className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      {t('form.additionalFees')}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                          {t('form.cleaningFee')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.cleaning_fee}
                          onChange={(e) => setFormData({ ...formData, cleaning_fee: parseFloat(e.target.value) })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                          {t('form.securityDeposit')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.security_deposit}
                          onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Comodidades */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200 shadow-sm">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>⭐</span>
                      {t('form.amenities')}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {AMENITY_KEYS.map((key) => (
                        <label key={key} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white transition-all cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAmenityChecked(key)}
                            onChange={() => toggleAmenity(key)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">{t(`amenitiesList.${key}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {/* Botones */}
                  <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingProperty(null);
                        resetForm();
                      }}
                      className="px-6 sm:px-8 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200"
                    >
                      {t('form.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                    >
                      {editingProperty ? `✨ ${t('form.update')}` : `✨ ${t('form.create')}`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
