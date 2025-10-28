'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Camera, Euro, Users, Bed, Bath } from 'lucide-react';
import { TenantProperty, CreatePropertyRequest } from '@/lib/direct-reservations-types';

export default function PropertiesManagement() {
  const [properties, setProperties] = useState<TenantProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<TenantProperty | null>(null);
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

  // Cargar propiedades al montar el componente
  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenant/properties', {
        headers: {
          'x-tenant-id': 'default' // TODO: Obtener del contexto de usuario
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setProperties(data.properties);
      }
    } catch (error) {
      console.error('Error cargando propiedades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingProperty 
        ? `/api/tenant/properties?id=${editingProperty.id}`
        : '/api/tenant/properties';
      
      const method = editingProperty ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'default'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadProperties();
        setShowForm(false);
        setEditingProperty(null);
        resetForm();
        alert(editingProperty ? 'Propiedad actualizada' : 'Propiedad creada');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error guardando propiedad:', error);
      alert('Error al guardar la propiedad');
    }
  };

  const handleEdit = (property: TenantProperty) => {
    setEditingProperty(property);
    setFormData({
      property_name: property.property_name,
      description: property.description || '',
      photos: property.photos || [],
      max_guests: property.max_guests,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      amenities: property.amenities || [],
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
    if (!confirm('¿Estás seguro de que quieres eliminar esta propiedad?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/tenant/properties?id=${propertyId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': 'default'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadProperties();
        alert('Propiedad eliminada');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error eliminando propiedad:', error);
      alert('Error al eliminar la propiedad');
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

  const toggleAmenity = (amenity: string) => {
    const currentAmenities = formData.amenities || [];
    const newAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter(a => a !== amenity)
      : [...currentAmenities, amenity];
    
    setFormData({ ...formData, amenities: newAmenities });
  };

  const commonAmenities = [
    'WiFi', 'Aire acondicionado', 'Calefacción', 'Cocina', 'Lavadora',
    'Secadora', 'Piscina', 'Jardín', 'Terraza', 'Parking', 'Ascensor',
    'Gimnasio', 'Spa', 'Recepción 24h', 'Limpieza diaria'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Propiedades</h1>
          <p className="text-gray-600 mt-2">Administra tus propiedades para reservas directas</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingProperty(null);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Propiedad
        </button>
      </div>

      {/* Lista de propiedades */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {properties.map((property) => (
          <div key={property.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {property.photos && property.photos.length > 0 ? (
              <img 
                src={property.photos[0]} 
                alt={property.property_name}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <Camera className="w-12 h-12 text-gray-400" />
              </div>
            )}
            
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {property.property_name}
              </h3>
              
              {property.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {property.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {property.max_guests} huéspedes
                </div>
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  {property.bedrooms} dormitorios
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  {property.bathrooms} baños
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-lg font-semibold text-green-600">
                  <Euro className="w-5 h-5" />
                  {property.base_price}/noche
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(property)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  property.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {property.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Formulario de nueva/edición propiedad */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingProperty ? 'Editar Propiedad' : 'Nueva Propiedad'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Propiedad *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.property_name}
                      onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Apartamento Centro Histórico"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Base por Noche (€) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe tu propiedad..."
                  />
                </div>
                
                {/* Características */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Huéspedes Máx.
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.max_guests}
                      onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dormitorios
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Baños
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Noches Mín.
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.minimum_nights}
                      onChange={(e) => setFormData({ ...formData, minimum_nights: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Tarifas adicionales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tarifa de Limpieza (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cleaning_fee}
                      onChange={(e) => setFormData({ ...formData, cleaning_fee: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Depósito de Seguridad (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.security_deposit}
                      onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Comodidades */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comodidades
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {commonAmenities.map((amenity) => (
                      <label key={amenity} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.amenities?.includes(amenity) || false}
                          onChange={() => toggleAmenity(amenity)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Botones */}
                <div className="flex justify-end gap-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingProperty(null);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingProperty ? 'Actualizar' : 'Crear'} Propiedad
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
