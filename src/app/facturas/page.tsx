'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Plus, 
  Download, 
  Trash2, 
  Eye, 
  AlertCircle, 
  Building2,
  Calendar,
  Euro,
  User
} from 'lucide-react';

interface Factura {
  id: number;
  numero_factura: string;
  fecha_emision: string;
  cliente_nombre: string;
  cliente_nif?: string;
  concepto: string;
  precio_base: number;
  iva_importe: number;
  total: number;
  forma_pago?: string;
  pdf_url?: string;
  pdf_filename?: string;
}

interface EmpresaConfig {
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

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulario de nueva factura
  const [nuevaFactura, setNuevaFactura] = useState({
    cliente_nombre: '',
    cliente_nif: '',
    cliente_direccion: '',
    cliente_codigo_postal: '',
    cliente_ciudad: '',
    cliente_provincia: '',
    cliente_pais: 'España',
    concepto: 'Alojamiento',
    descripcion: '',
    total_pagado: 0, // Cambio: ahora es el total que pagó el cliente
    iva_porcentaje: 21,
    forma_pago: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [facturasResponse, configResponse] = await Promise.all([
        fetch('/api/facturas'),
        fetch('/api/empresa-config')
      ]);

      const facturasData = await facturasResponse.json();
      const configData = await configResponse.json();

      if (facturasResponse.ok) {
        // Asegurar que los campos numéricos sean números
        const facturasProcesadas = (facturasData.facturas || []).map((factura: any) => ({
          ...factura,
          precio_base: parseFloat(factura.precio_base || 0),
          iva_importe: parseFloat(factura.iva_importe || 0),
          total: parseFloat(factura.total || 0),
          iva_porcentaje: parseFloat(factura.iva_porcentaje || 21)
        }));
        setFacturas(facturasProcesadas);
      }

      if (configResponse.ok && configData.empresa) {
        setEmpresaConfig(configData.empresa);
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Debes configurar los datos de tu empresa antes de generar facturas. Ve a Configuración > Datos Empresa.' 
        });
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setMessage({ type: 'error', text: 'Error al cargar los datos' });
    } finally {
      setLoading(false);
    }
  };

  const crearFactura = async () => {
    if (!nuevaFactura.cliente_nombre || !nuevaFactura.concepto || nuevaFactura.total_pagado <= 0) {
      setMessage({ type: 'error', text: 'Por favor completa todos los campos obligatorios' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Calcular precio base e IVA desde el total pagado
      const precioBase = calcularPrecioBase();
      const ivaImporte = calcularIVA();
      
      const datosFactura = {
        ...nuevaFactura,
        precio_base: precioBase,
        total: nuevaFactura.total_pagado,
        iva_importe: ivaImporte
      };

      const response = await fetch('/api/facturas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosFactura),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Factura creada correctamente' });
        setNuevaFactura({
          cliente_nombre: '',
          cliente_nif: '',
          cliente_direccion: '',
          cliente_codigo_postal: '',
          cliente_ciudad: '',
          cliente_provincia: '',
          cliente_pais: 'España',
          concepto: 'Alojamiento',
          descripcion: '',
          total_pagado: 0,
          iva_porcentaje: 21,
          forma_pago: '',
        });
        // Recargar la lista después de un pequeño delay
        setTimeout(() => {
          cargarDatos();
        }, 500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al crear la factura' });
      }
    } catch (error) {
      console.error('Error al crear factura:', error);
      setMessage({ type: 'error', text: 'Error al crear la factura' });
    } finally {
      setSaving(false);
    }
  };

  const eliminarFactura = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta factura?')) {
      return;
    }

    try {
      const response = await fetch(`/api/facturas/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Factura eliminada correctamente' });
        cargarDatos(); // Recargar la lista
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Error al eliminar la factura' });
      }
    } catch (error) {
      console.error('Error al eliminar factura:', error);
      setMessage({ type: 'error', text: 'Error al eliminar la factura' });
    }
  };

  const descargarPdf = async (factura: Factura) => {
    try {
      const response = await fetch(`/api/facturas/${factura.id}/pdf`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura_${factura.numero_factura}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setMessage({ type: 'error', text: 'Error al generar el PDF' });
      }
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      setMessage({ type: 'error', text: 'Error al descargar el PDF' });
    }
  };

  // Nuevas funciones para calcular precio base e IVA desde el total
  const calcularPrecioBase = () => {
    // Fórmula: precio_base = total_pagado / (1 + iva_porcentaje/100)
    return nuevaFactura.total_pagado / (1 + nuevaFactura.iva_porcentaje / 100);
  };

  const calcularIVA = () => {
    const precioBase = calcularPrecioBase();
    return nuevaFactura.total_pagado - precioBase;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando facturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-5xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🧾</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Generador de Facturas</span>
          </h1>
          <p className="text-gray-600 text-lg">Crea y gestiona las facturas de tu alojamiento</p>
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

      <Tabs defaultValue="nueva" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded-xl shadow-lg">
          <TabsTrigger 
            value="nueva" 
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-700 font-medium rounded-xl transition-all duration-200 hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Factura</span>
          </TabsTrigger>
          <TabsTrigger 
            value="historial" 
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-700 font-medium rounded-xl transition-all duration-200 hover:shadow-md"
          >
            <FileText className="w-4 h-4" />
            <span>Historial ({facturas.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nueva" className="space-y-6">
          {!empresaConfig ? (
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-xl rounded-xl">
              <div className="text-center">
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Configuración Requerida
                </h3>
                <p className="text-gray-600 mb-4">
                  Necesitas configurar los datos de tu empresa antes de generar facturas.
                </p>
                <Button 
                  onClick={() => window.location.href = '/settings/empresa'}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Ir a Configuración
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 bg-white shadow-xl rounded-xl border border-blue-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Nueva Factura</h2>
              
              <div className="space-y-6">
                {/* Datos del Cliente */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Datos del Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cliente_nombre" className="text-gray-700 font-medium">Nombre Completo *</Label>
                        <Input
                          id="cliente_nombre"
                          value={nuevaFactura.cliente_nombre}
                          onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_nombre: e.target.value }))}
                          placeholder="Juan Pérez"
                          className="text-gray-900 placeholder:text-gray-400"
                          style={{ color: '#111827' }}
                          required
                        />
                    </div>
                    <div>
                      <Label htmlFor="cliente_nif" className="text-gray-700 font-medium">NIF/DNI</Label>
                      <Input
                        id="cliente_nif"
                        value={nuevaFactura.cliente_nif}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_nif: e.target.value }))}
                        placeholder="12345678A"
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="cliente_direccion" className="text-gray-700 font-medium">Dirección</Label>
                    <Input
                      id="cliente_direccion"
                      value={nuevaFactura.cliente_direccion}
                      onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_direccion: e.target.value }))}
                      placeholder="Calle Mayor, 123"
                      className="text-gray-900 placeholder:text-gray-400"
                      style={{ color: '#111827' }}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label htmlFor="cliente_codigo_postal" className="text-gray-700 font-medium">Código Postal</Label>
                      <Input
                        id="cliente_codigo_postal"
                        value={nuevaFactura.cliente_codigo_postal}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_codigo_postal: e.target.value }))}
                        placeholder="29640"
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cliente_ciudad" className="text-gray-700 font-medium">Ciudad</Label>
                      <Input
                        id="cliente_ciudad"
                        value={nuevaFactura.cliente_ciudad}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_ciudad: e.target.value }))}
                        placeholder="Fuengirola"
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cliente_provincia" className="text-gray-700 font-medium">Provincia</Label>
                      <Input
                        id="cliente_provincia"
                        value={nuevaFactura.cliente_provincia}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_provincia: e.target.value }))}
                        placeholder="Málaga"
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Concepto y Precio */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Euro className="w-5 h-5 mr-2 text-purple-600" />
                    Concepto y Precio
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="concepto" className="text-gray-700 font-medium">Concepto *</Label>
                      <Input
                        id="concepto"
                        value={nuevaFactura.concepto}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, concepto: e.target.value }))}
                        placeholder="Alojamiento"
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="total_pagado" className="text-gray-700 font-medium">Total Pagado por el Cliente (€) *</Label>
                      <Input
                        id="total_pagado"
                        type="number"
                        step="0.01"
                        min="0"
                        value={nuevaFactura.total_pagado}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, total_pagado: parseFloat(e.target.value) || 0 }))}
                        placeholder="121.00"
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="descripcion" className="text-gray-700 font-medium">Descripción</Label>
                    <Input
                      id="descripcion"
                      value={nuevaFactura.descripcion}
                      onChange={(e) => setNuevaFactura(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Estancia de 3 noches en habitación doble"
                      className="text-gray-900 placeholder:text-gray-400"
                      style={{ color: '#111827' }}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="iva_porcentaje" className="text-gray-700 font-medium">IVA (%)</Label>
                      <Input
                        id="iva_porcentaje"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={nuevaFactura.iva_porcentaje}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, iva_porcentaje: parseFloat(e.target.value) || 0 }))}
                        placeholder="21"
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="forma_pago" className="text-gray-700 font-medium">Forma de Pago</Label>
                      <Input
                        id="forma_pago"
                        value={nuevaFactura.forma_pago}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, forma_pago: e.target.value }))}
                        placeholder="Transferencia bancaria"
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Resumen */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-lg">
                  <h4 className="font-semibold text-gray-800 mb-4 text-center text-lg">Resumen de la Factura</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Precio base:</span>
                      <span className="text-gray-900 font-medium">{calcularPrecioBase().toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">IVA ({nuevaFactura.iva_porcentaje}%):</span>
                      <span className="text-gray-900 font-medium">{calcularIVA().toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-gray-300 pt-2">
                      <span className="text-gray-800">Total:</span>
                      <span className="text-blue-600 text-lg">{nuevaFactura.total_pagado.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={crearFactura} 
                  disabled={saving || !nuevaFactura.cliente_nombre || !nuevaFactura.concepto || nuevaFactura.total_pagado <= 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creando factura...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Crear Factura
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historial" className="space-y-6">
          <Card className="p-6 bg-white shadow-xl rounded-xl border border-blue-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Historial de Facturas</h2>
            
            {facturas.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay facturas</h3>
                <p className="text-gray-600 text-lg">Crea tu primera factura usando la pestaña "Nueva Factura"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {facturas.map((factura) => (
                  <div key={factura.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {factura.numero_factura}
                            </h3>
                            <p className="text-sm text-gray-700 font-medium">
                              {factura.cliente_nombre}
                            </p>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1 text-blue-600" />
                              {new Date(factura.fecha_emision).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className="font-bold text-blue-600 text-lg">
                              {parseFloat(factura.total || 0).toFixed(2)} €
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 font-medium">
                          {factura.concepto}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => descargarPdf(factura)}
                          className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => eliminarFactura(factura.id)}
                          className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-700 hover:from-red-100 hover:to-pink-100 hover:border-red-300 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
