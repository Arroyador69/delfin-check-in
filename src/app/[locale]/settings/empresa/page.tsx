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
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
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
      
      if (response.ok && data.empresa) {
        setConfig(data.empresa);
        if (data.empresa.logo_url) {
          setLogoPreview(data.empresa.logo_url);
        }
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
      let logoUrl = config.logo_url;

      // Si hay un archivo de logo, subirlo primero
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);

        const uploadResponse = await fetch('/api/upload-logo', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (uploadResponse.ok) {
          logoUrl = uploadData.logoUrl;
        } else {
          setMessage({ type: 'error', text: uploadData.error || 'Error al subir el logo' });
          setSaving(false);
          return;
        }
      }

      // Guardar configuración con el logo
      const response = await fetch('/api/empresa-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          logo_url: logoUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
        setConfig(data.config);
        setLogoFile(null); // Limpiar archivo después de guardar
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

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Por favor selecciona un archivo de imagen válido' });
        return;
      }
      
      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'El archivo debe ser menor a 2MB' });
        return;
      }
      
      setLogoFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-5xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏢</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Datos de la Empresa</span>
          </h1>
          <p className="text-gray-600 text-lg">Configura los datos de tu empresa para generar facturas</p>
        </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center space-x-2 shadow-lg animate-fade-in ${
          message.type === 'success' 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200' 
            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border border-red-200'
        }`}>
          <AlertCircle className={`w-5 h-5 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
          <span>{message.text}</span>
        </div>
      )}

      <Card className="p-8 bg-white shadow-xl rounded-xl border border-blue-200">
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📋</span>
              Información Básica
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre_empresa" className="text-gray-700 font-semibold text-base mb-2 block">Nombre de la Empresa *</Label>
                <Input
                  id="nombre_empresa"
                  value={config.nombre_empresa}
                  onChange={(e) => handleInputChange('nombre_empresa', e.target.value)}
                  placeholder="Ej: Hotel Delfín"
                  className="text-gray-900 placeholder:text-gray-400"
                  style={{ color: '#111827' }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="nif_empresa" className="text-gray-700 font-semibold text-base mb-2 block">NIF/CIF (DNI, NIE, CIF) *</Label>
                <Input
                  id="nif_empresa"
                  value={config.nif_empresa}
                  onChange={(e) => handleInputChange('nif_empresa', e.target.value)}
                  placeholder="Ej: B12345678"
                  className="text-gray-900 placeholder:text-gray-400"
                  style={{ color: '#111827' }}
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📍</span>
              Dirección
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="direccion_empresa" className="text-gray-700 font-semibold text-base mb-2 block">Dirección *</Label>
                <Input
                  id="direccion_empresa"
                  value={config.direccion_empresa}
                  onChange={(e) => handleInputChange('direccion_empresa', e.target.value)}
                  placeholder="Calle, número, piso, puerta"
                  className="text-gray-900 placeholder:text-gray-400"
                  style={{ color: '#111827' }}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="codigo_postal" className="text-gray-700 font-semibold text-base mb-2 block">Código Postal</Label>
                  <Input
                    id="codigo_postal"
                    value={config.codigo_postal}
                    onChange={(e) => handleInputChange('codigo_postal', e.target.value)}
                    placeholder="29640"
                    className="text-gray-900 placeholder:text-gray-400"
                  style={{ color: '#111827' }}
                  />
                </div>
                <div>
                  <Label htmlFor="ciudad" className="text-gray-700 font-semibold text-base mb-2 block">Ciudad</Label>
                  <Input
                    id="ciudad"
                    value={config.ciudad}
                    onChange={(e) => handleInputChange('ciudad', e.target.value)}
                    placeholder="Fuengirola"
                    className="text-gray-900 placeholder:text-gray-400"
                  style={{ color: '#111827' }}
                  />
                </div>
                <div>
                  <Label htmlFor="provincia" className="text-gray-700 font-semibold text-base mb-2 block">Provincia</Label>
                  <Input
                    id="provincia"
                    value={config.provincia}
                    onChange={(e) => handleInputChange('provincia', e.target.value)}
                    placeholder="Málaga"
                    className="text-gray-900 placeholder:text-gray-400"
                  style={{ color: '#111827' }}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pais" className="text-gray-700 font-semibold text-base mb-2 block">País</Label>
                <Input
                  id="pais"
                  value={config.pais}
                  onChange={(e) => handleInputChange('pais', e.target.value)}
                  placeholder="España"
                  className="text-gray-900 placeholder:text-gray-400"
                  style={{ color: '#111827' }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📞</span>
              Contacto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefono" className="text-gray-700 font-semibold text-base mb-2 block">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={config.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    placeholder="+34 952 123 456"
                    className="text-gray-900 placeholder:text-gray-400"
                  style={{ color: '#111827' }}
                  />
              </div>
              <div>
                <Label htmlFor="email" className="text-gray-700 font-semibold text-base mb-2 block">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={config.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="info@hoteldelfin.com"
                    className="text-gray-900 placeholder:text-gray-400"
                  style={{ color: '#111827' }}
                  />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="web" className="text-gray-700 font-semibold text-base mb-2 block">Sitio Web</Label>
              <Input
                id="web"
                value={config.web}
                onChange={(e) => handleInputChange('web', e.target.value)}
                placeholder="https://www.hoteldelfin.com"
                className="text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🎨</span>
              Logo
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo_file" className="text-gray-700 font-semibold text-base mb-2 block">Subir Logo</Label>
                <Input
                  id="logo_file"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="text-gray-900"
                  style={{ color: '#111827' }}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Formatos recomendados: PNG, JPG, SVG. Tamaño máximo: 2MB. Dimensiones recomendadas: 200x100px
                </p>
              </div>
              
              {logoPreview && (
                <div>
                  <Label className="text-gray-700 font-semibold text-base mb-2 block">Vista previa del logo:</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                    <img 
                      src={logoPreview} 
                      alt="Preview del logo" 
                      className="max-h-20 max-w-40 object-contain"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="logo_url" className="text-gray-700 font-semibold text-base mb-2 block">O URL del Logo (alternativa)</Label>
                <Input
                  id="logo_url"
                  value={config.logo_url}
                  onChange={(e) => handleInputChange('logo_url', e.target.value)}
                  placeholder="https://ejemplo.com/logo.png"
                  className="text-gray-900 placeholder:text-gray-400"
                  style={{ color: '#111827' }}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Si prefieres usar una URL en lugar de subir un archivo
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Completa los campos obligatorios (*) y haz clic en "Guardar Configuración" para guardar los datos en la base de datos.
              </p>
            </div>
            <Button 
              onClick={guardarConfiguracion} 
              disabled={saving || !config.nombre_empresa || !config.nif_empresa || !config.direccion_empresa}
              className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
}
