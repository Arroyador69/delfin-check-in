'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Building2, Save, AlertCircle } from 'lucide-react';

interface EmpresaConfig {
  id?: number;
  tenant_id: string;
  nombre_empresa: string;
  nif_empresa: string;
  direccion_empresa: string;
  codigo_postal?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  telefono?: string;
  email?: string;
  web?: string;
  logo_url?: string;
}

export default function EmpresaConfigPage() {
  const [config, setConfig] = useState<EmpresaConfig>({
    tenant_id: '',
    nombre_empresa: '',
    nif_empresa: '',
    direccion_empresa: '',
    codigo_postal: '',
    ciudad: '',
    provincia: '',
    pais: 'España',
    telefono: '',
    email: '',
    web: '',
    logo_url: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const response = await fetch('/api/empresa-config');
      const data = await response.json();
      
      if (response.ok && data.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      setMessage({ type: 'error', text: 'Error al cargar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  const guardarConfiguracion = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/empresa-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
        setConfig(data.config);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar la configuración' });
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof EmpresaConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Building2 className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Datos de la Empresa</h1>
          <p className="text-gray-600">Configura los datos de tu empresa para generar facturas</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <AlertCircle className="w-5 h-5" />
          <span>{message.text}</span>
        </div>
      )}

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre_empresa">Nombre de la Empresa *</Label>
                <Input
                  id="nombre_empresa"
                  value={config.nombre_empresa}
                  onChange={(e) => handleInputChange('nombre_empresa', e.target.value)}
                  placeholder="Ej: Hotel Delfín"
                  required
                />
              </div>
              <div>
                <Label htmlFor="nif_empresa">NIF/CIF *</Label>
                <Input
                  id="nif_empresa"
                  value={config.nif_empresa}
                  onChange={(e) => handleInputChange('nif_empresa', e.target.value)}
                  placeholder="Ej: B12345678"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dirección</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="direccion_empresa">Dirección *</Label>
                <Input
                  id="direccion_empresa"
                  value={config.direccion_empresa}
                  onChange={(e) => handleInputChange('direccion_empresa', e.target.value)}
                  placeholder="Calle, número, piso, puerta"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="codigo_postal">Código Postal</Label>
                  <Input
                    id="codigo_postal"
                    value={config.codigo_postal}
                    onChange={(e) => handleInputChange('codigo_postal', e.target.value)}
                    placeholder="29640"
                  />
                </div>
                <div>
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    value={config.ciudad}
                    onChange={(e) => handleInputChange('ciudad', e.target.value)}
                    placeholder="Fuengirola"
                  />
                </div>
                <div>
                  <Label htmlFor="provincia">Provincia</Label>
                  <Input
                    id="provincia"
                    value={config.provincia}
                    onChange={(e) => handleInputChange('provincia', e.target.value)}
                    placeholder="Málaga"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  value={config.pais}
                  onChange={(e) => handleInputChange('pais', e.target.value)}
                  placeholder="España"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contacto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={config.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  placeholder="+34 952 123 456"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={config.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="info@hoteldelfin.com"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="web">Sitio Web</Label>
              <Input
                id="web"
                value={config.web}
                onChange={(e) => handleInputChange('web', e.target.value)}
                placeholder="https://www.hoteldelfin.com"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Logo</h2>
            <div>
              <Label htmlFor="logo_url">URL del Logo</Label>
              <Input
                id="logo_url"
                value={config.logo_url}
                onChange={(e) => handleInputChange('logo_url', e.target.value)}
                placeholder="https://ejemplo.com/logo.png"
              />
              <p className="text-sm text-gray-500 mt-1">
                URL de la imagen del logo que aparecerá en las facturas
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={guardarConfiguracion} 
              disabled={saving || !config.nombre_empresa || !config.nif_empresa || !config.direccion_empresa}
              className="w-full md:w-auto"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
