'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
  AlertCircle, 
  Building2,
  Calendar,
  Euro,
  User,
  Banknote,
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

interface Recibo {
  id: number;
  numero_recibo: string;
  fecha_emision: string;
  cliente_nombre: string;
  concepto: string;
  descripcion?: string | null;
  fecha_pago?: string | null;
  fecha_estancia_desde?: string | null;
  fecha_estancia_hasta?: string | null;
  importe_total: number;
  incluir_iva: boolean;
  iva_porcentaje?: number;
  forma_pago?: string;
}

function formatReciboDateOnly(value: string | null | undefined, loc: string): string {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(loc);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(loc);
}

export default function FacturasPage() {
  const t = useTranslations('facturas');
  const locale = useLocale();

  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mainTab, setMainTab] = useState<'facturas' | 'recibos'>('facturas');
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [savingReceipt, setSavingReceipt] = useState(false);

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

  const [nuevoRecibo, setNuevoRecibo] = useState({
    cliente_nombre: '',
    cliente_nif: '',
    cliente_direccion: '',
    cliente_codigo_postal: '',
    cliente_ciudad: '',
    cliente_provincia: '',
    cliente_pais: 'España',
    concepto: 'Alojamiento',
    descripcion: '',
    fecha_pago: '',
    fecha_estancia_desde: '',
    fecha_estancia_hasta: '',
    importe_total: 0,
    incluir_iva: false,
    iva_porcentaje: 21,
    forma_pago: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [facturasResponse, configResponse, recibosResponse] = await Promise.all([
        fetch('/api/facturas'),
        fetch('/api/empresa-config'),
        fetch('/api/recibos'),
      ]);

      const facturasData = await facturasResponse.json();
      const configData = await configResponse.json();
      const recibosData = recibosResponse.ok ? await recibosResponse.json() : { recibos: [] };

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
          text: t('errorEmpresa') 
        });
      }

      if (recibosResponse.ok && Array.isArray(recibosData.recibos)) {
        setRecibos(
          recibosData.recibos.map((r: any) => ({
            ...r,
            importe_total: parseFloat(r.importe_total || 0),
            incluir_iva: Boolean(r.incluir_iva),
            iva_porcentaje: parseFloat(r.iva_porcentaje || 0),
          }))
        );
      } else {
        setRecibos([]);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setMessage({ type: 'error', text: t('errorLoad') });
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
        setMessage({ type: 'success', text: t('successCreate') });
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
        setMessage({ type: 'error', text: data.error || t('errorCreate') });
      }
    } catch (error) {
      console.error('Error al crear factura:', error);
      setMessage({ type: 'error', text: t('errorCreate') });
    } finally {
      setSaving(false);
    }
  };

  const eliminarFactura = async (id: number) => {
    if (!confirm(t('confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/facturas/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: t('successDelete') });
        cargarDatos(); // Recargar la lista
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || t('errorDelete') });
      }
    } catch (error) {
      console.error('Error al eliminar factura:', error);
      setMessage({ type: 'error', text: t('errorDelete') });
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
        setMessage({ type: 'error', text: t('errorPdf') });
      }
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      setMessage({ type: 'error', text: t('errorDownloadPdf') });
    }
  };

  const calcularBaseRecibo = () => {
    if (!nuevoRecibo.incluir_iva || nuevoRecibo.importe_total <= 0) return nuevoRecibo.importe_total;
    return nuevoRecibo.importe_total / (1 + nuevoRecibo.iva_porcentaje / 100);
  };
  const calcularIvaRecibo = () => {
    if (!nuevoRecibo.incluir_iva) return 0;
    const base = calcularBaseRecibo();
    return nuevoRecibo.importe_total - base;
  };

  const crearReciboSubmit = async () => {
    if (!nuevoRecibo.cliente_nombre || !nuevoRecibo.concepto || nuevoRecibo.importe_total <= 0) {
      setMessage({ type: 'error', text: t('errorRequired') });
      return;
    }
    setSavingReceipt(true);
    setMessage(null);
    try {
      const response = await fetch('/api/recibos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nombre: nuevoRecibo.cliente_nombre,
          cliente_nif: nuevoRecibo.cliente_nif,
          cliente_direccion: nuevoRecibo.cliente_direccion,
          cliente_codigo_postal: nuevoRecibo.cliente_codigo_postal,
          cliente_ciudad: nuevoRecibo.cliente_ciudad,
          cliente_provincia: nuevoRecibo.cliente_provincia,
          cliente_pais: nuevoRecibo.cliente_pais,
          concepto: nuevoRecibo.concepto,
          descripcion: nuevoRecibo.descripcion,
          fecha_pago: nuevoRecibo.fecha_pago || undefined,
          fecha_estancia_desde: nuevoRecibo.fecha_estancia_desde || undefined,
          fecha_estancia_hasta: nuevoRecibo.fecha_estancia_hasta || undefined,
          importe_total: nuevoRecibo.importe_total,
          incluir_iva: nuevoRecibo.incluir_iva,
          iva_porcentaje: nuevoRecibo.incluir_iva ? nuevoRecibo.iva_porcentaje : 0,
          forma_pago: nuevoRecibo.forma_pago,
        }),
      });
      const data = await response.json();
      if (response.ok && data.recibo) {
        setMessage({ type: 'success', text: t('successCreateReceipt') });
        setNuevoRecibo({
          cliente_nombre: '',
          cliente_nif: '',
          cliente_direccion: '',
          cliente_codigo_postal: '',
          cliente_ciudad: '',
          cliente_provincia: '',
          cliente_pais: 'España',
          concepto: 'Alojamiento',
          descripcion: '',
          fecha_pago: '',
          fecha_estancia_desde: '',
          fecha_estancia_hasta: '',
          importe_total: 0,
          incluir_iva: false,
          iva_porcentaje: 21,
          forma_pago: '',
        });
        setTimeout(() => cargarDatos(), 400);
      } else {
        setMessage({ type: 'error', text: data.error || t('errorCreateReceipt') });
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: t('errorCreateReceipt') });
    } finally {
      setSavingReceipt(false);
    }
  };

  const eliminarRecibo = async (id: number) => {
    if (!confirm(t('confirmDeleteReceipt'))) return;
    try {
      const response = await fetch(`/api/recibos/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setMessage({ type: 'success', text: t('successDeleteReceipt') });
        cargarDatos();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || t('errorDeleteReceipt') });
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: t('errorDeleteReceipt') });
    }
  };

  const descargarPdfRecibo = async (recibo: Recibo) => {
    try {
      const response = await fetch(`/api/recibos/${recibo.id}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recibo_${recibo.numero_recibo}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setMessage({ type: 'error', text: t('errorPdfReceipt') });
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: t('errorPdfReceipt') });
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
          <p className="mt-2 text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4">
            <span className="text-3xl sm:text-5xl mr-2 sm:mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🧾</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t('title')}</span>
          </h1>
          <p className="text-gray-600 text-sm sm:text-lg">{t('subtitle')}</p>
          {mainTab === 'recibos' && (
            <p className="text-sm text-emerald-800 mt-2 max-w-2xl mx-auto">{t('receiptBadge')}</p>
          )}
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

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'facturas' | 'recibos')} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-200 rounded-xl shadow-md gap-2 p-1 max-w-md mx-auto">
          <TabsTrigger
            value="facturas"
            className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg text-gray-700 font-medium text-xs sm:text-sm py-2"
          >
            <FileText className="w-4 h-4" />
            <span>{t('docTabInvoices')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="recibos"
            className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg text-gray-700 font-medium text-xs sm:text-sm py-2"
          >
            <Banknote className="w-4 h-4" />
            <span>{t('docTabReceipts')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facturas" className="space-y-4 sm:space-y-6 mt-4">
      <Tabs defaultValue="nueva" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded-xl shadow-lg gap-2 p-1">
          <TabsTrigger 
            value="nueva" 
            className="flex items-center justify-center space-x-1 sm:space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-700 font-medium rounded-xl transition-all duration-200 hover:shadow-md text-xs sm:text-sm py-2"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t('tabNueva')}</span>
            <span className="sm:hidden">{t('tabNuevaShort')}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="historial" 
            className="flex items-center justify-center space-x-1 sm:space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-700 font-medium rounded-xl transition-all duration-200 hover:shadow-md text-xs sm:text-sm py-2"
          >
            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t('tabHistorial', { count: facturas.length })}</span>
            <span className="sm:hidden">{t('tabHistorialShort')}</span>
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
                  {t('configRequired')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('configMessage')}
                </p>
                <Button 
                  onClick={() => window.location.href = '/settings/empresa'}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  {t('goToSettings')}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-4 sm:p-6 bg-white shadow-xl rounded-xl border border-blue-200">
                              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t('newInvoiceTitle')}</h2>
              
                              <div className="space-y-4 sm:space-y-6">
                {/* Datos del Cliente */}
                                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl border border-blue-200 shadow-sm">
                                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                      {t('clientData')}
                    </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cliente_nombre" className="text-gray-700 font-medium">{t('fullName')}</Label>
                        <Input
                          id="cliente_nombre"
                          value={nuevaFactura.cliente_nombre}
                          onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_nombre: e.target.value }))}
                          placeholder={t('fullNamePlaceholder')}
                          className="text-gray-900 placeholder:text-gray-400"
                          style={{ color: '#111827' }}
                          required
                        />
                    </div>
                    <div>
                      <Label htmlFor="cliente_nif" className="text-gray-700 font-medium">{t('nifDni')}</Label>
                      <Input
                        id="cliente_nif"
                        value={nuevaFactura.cliente_nif}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_nif: e.target.value }))}
                        placeholder={t('nifPlaceholder')}
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="cliente_direccion" className="text-gray-700 font-medium">{t('address')}</Label>
                    <Input
                      id="cliente_direccion"
                      value={nuevaFactura.cliente_direccion}
                      onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_direccion: e.target.value }))}
                      placeholder={t('addressPlaceholder')}
                      className="text-gray-900 placeholder:text-gray-400"
                      style={{ color: '#111827' }}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label htmlFor="cliente_codigo_postal" className="text-gray-700 font-medium">{t('postalCode')}</Label>
                      <Input
                        id="cliente_codigo_postal"
                        value={nuevaFactura.cliente_codigo_postal}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_codigo_postal: e.target.value }))}
                        placeholder={t('postalPlaceholder')}
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cliente_ciudad" className="text-gray-700 font-medium">{t('city')}</Label>
                      <Input
                        id="cliente_ciudad"
                        value={nuevaFactura.cliente_ciudad}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_ciudad: e.target.value }))}
                        placeholder={t('cityPlaceholder')}
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cliente_provincia" className="text-gray-700 font-medium">{t('province')}</Label>
                      <Input
                        id="cliente_provincia"
                        value={nuevaFactura.cliente_provincia}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, cliente_provincia: e.target.value }))}
                        placeholder={t('provincePlaceholder')}
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
                    {t('conceptAndPrice')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="concepto" className="text-gray-700 font-medium">{t('concept')}</Label>
                      <Input
                        id="concepto"
                        value={nuevaFactura.concepto}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, concepto: e.target.value }))}
                        placeholder={t('conceptPlaceholder')}
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="total_pagado" className="text-gray-700 font-medium">{t('totalPaid')}</Label>
                      <Input
                        id="total_pagado"
                        type="number"
                        step="0.01"
                        min="0"
                        value={nuevaFactura.total_pagado}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, total_pagado: parseFloat(e.target.value) || 0 }))}
                        placeholder={t('totalPlaceholder')}
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="descripcion" className="text-gray-700 font-medium">{t('description')}</Label>
                    <Input
                      id="descripcion"
                      value={nuevaFactura.descripcion}
                      onChange={(e) => setNuevaFactura(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder={t('descriptionPlaceholder')}
                      className="text-gray-900 placeholder:text-gray-400"
                      style={{ color: '#111827' }}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="iva_porcentaje" className="text-gray-700 font-medium">{t('ivaPercent')}</Label>
                      <Input
                        id="iva_porcentaje"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={nuevaFactura.iva_porcentaje}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, iva_porcentaje: parseFloat(e.target.value) || 0 }))}
                        placeholder={t('ivaPlaceholder')}
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="forma_pago" className="text-gray-700 font-medium">{t('paymentMethod')}</Label>
                      <Input
                        id="forma_pago"
                        value={nuevaFactura.forma_pago}
                        onChange={(e) => setNuevaFactura(prev => ({ ...prev, forma_pago: e.target.value }))}
                        placeholder={t('paymentPlaceholder')}
                        className="text-gray-900 placeholder:text-gray-400"
                        style={{ color: '#111827' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Resumen */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-lg">
                  <h4 className="font-semibold text-gray-800 mb-4 text-center text-lg">{t('summaryTitle')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">{t('priceBase')}</span>
                      <span className="text-gray-900 font-medium">{calcularPrecioBase().toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">{t('ivaLabel', { pct: nuevaFactura.iva_porcentaje })}</span>
                      <span className="text-gray-900 font-medium">{calcularIVA().toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-gray-300 pt-2">
                      <span className="text-gray-800">{t('total')}</span>
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
                      {t('creating')}
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      {t('createButton')}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historial" className="space-y-6">
          <Card className="p-6 bg-white shadow-xl rounded-xl border border-blue-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t('historyTitle')}</h2>
            
            {facturas.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('noInvoices')}</h3>
                <p className="text-gray-600 text-lg">{t('noInvoicesHint')}</p>
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
                              {new Date(factura.fecha_emision).toLocaleDateString(locale)}
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className="font-bold text-blue-600 text-lg">
                              {Number(factura.total ?? 0).toFixed(2)} €
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
                          {t('pdf')}
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
        </TabsContent>

        <TabsContent value="recibos" className="space-y-4 sm:space-y-6 mt-4">
          <Tabs defaultValue="nueva-recibo" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200 rounded-xl shadow-lg gap-2 p-1">
              <TabsTrigger
                value="nueva-recibo"
                className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white text-gray-700 font-medium rounded-xl text-xs sm:text-sm py-2"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t('tabNuevaRecibo')}</span>
                <span className="sm:hidden">{t('tabNuevaReciboShort')}</span>
              </TabsTrigger>
              <TabsTrigger
                value="historial-recibo"
                className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white text-gray-700 font-medium rounded-xl text-xs sm:text-sm py-2"
              >
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t('tabHistorialRecibo', { count: recibos.length })}</span>
                <span className="sm:hidden">{t('tabHistorialReciboShort')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nueva-recibo" className="space-y-6">
              {!empresaConfig ? (
                <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-xl rounded-xl">
                  <div className="text-center">
                    <Building2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('configRequired')}</h3>
                    <p className="text-gray-600 mb-4">{t('configMessage')}</p>
                    <Button
                      onClick={() => (window.location.href = `/${locale}/settings/empresa`)}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                    >
                      {t('goToSettings')}
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-4 sm:p-6 bg-white shadow-xl rounded-xl border border-emerald-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-center bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-6">
                    {t('receiptNewTitle')}
                  </h2>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 sm:p-6 rounded-xl border border-emerald-200">
                      <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                        <User className="w-5 h-5 mr-2 text-emerald-600" />
                        {t('clientData')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="r_cliente_nombre">{t('fullName')}</Label>
                          <Input
                            id="r_cliente_nombre"
                            value={nuevoRecibo.cliente_nombre}
                            onChange={(e) => setNuevoRecibo((p) => ({ ...p, cliente_nombre: e.target.value }))}
                            className="text-gray-900"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="r_cliente_nif">{t('nifDni')}</Label>
                          <Input
                            id="r_cliente_nif"
                            value={nuevoRecibo.cliente_nif}
                            onChange={(e) => setNuevoRecibo((p) => ({ ...p, cliente_nif: e.target.value }))}
                            className="text-gray-900"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label htmlFor="r_direccion">{t('address')}</Label>
                        <Input
                          id="r_direccion"
                          value={nuevoRecibo.cliente_direccion}
                          onChange={(e) => setNuevoRecibo((p) => ({ ...p, cliente_direccion: e.target.value }))}
                          className="text-gray-900"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <Label htmlFor="r_cp">{t('postalCode')}</Label>
                          <Input
                            id="r_cp"
                            value={nuevoRecibo.cliente_codigo_postal}
                            onChange={(e) => setNuevoRecibo((p) => ({ ...p, cliente_codigo_postal: e.target.value }))}
                            className="text-gray-900"
                          />
                        </div>
                        <div>
                          <Label htmlFor="r_ciudad">{t('city')}</Label>
                          <Input
                            id="r_ciudad"
                            value={nuevoRecibo.cliente_ciudad}
                            onChange={(e) => setNuevoRecibo((p) => ({ ...p, cliente_ciudad: e.target.value }))}
                            className="text-gray-900"
                          />
                        </div>
                        <div>
                          <Label htmlFor="r_prov">{t('province')}</Label>
                          <Input
                            id="r_prov"
                            value={nuevoRecibo.cliente_provincia}
                            onChange={(e) => setNuevoRecibo((p) => ({ ...p, cliente_provincia: e.target.value }))}
                            className="text-gray-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-200">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Euro className="w-5 h-5 mr-2 text-teal-600" />
                        {t('conceptAndPrice')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="r_concepto">{t('concept')}</Label>
                          <Input
                            id="r_concepto"
                            value={nuevoRecibo.concepto}
                            onChange={(e) => setNuevoRecibo((p) => ({ ...p, concepto: e.target.value }))}
                            className="text-gray-900"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="r_importe">{t('receiptAmountLabel')}</Label>
                          <Input
                            id="r_importe"
                            type="number"
                            step="0.01"
                            min="0"
                            value={nuevoRecibo.importe_total || ''}
                            onChange={(e) =>
                              setNuevoRecibo((p) => ({ ...p, importe_total: parseFloat(e.target.value) || 0 }))
                            }
                            placeholder={t('receiptAmountPlaceholder')}
                            className="text-gray-900"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <Label htmlFor="r_fecha_pago">{t('receiptPaymentDateLabel')}</Label>
                          <Input
                            id="r_fecha_pago"
                            type="date"
                            value={nuevoRecibo.fecha_pago}
                            onChange={(e) => setNuevoRecibo((p) => ({ ...p, fecha_pago: e.target.value }))}
                            className="text-gray-900"
                          />
                        </div>
                        <div>
                          <Label htmlFor="r_est_desde">{t('receiptStayFromLabel')}</Label>
                          <Input
                            id="r_est_desde"
                            type="date"
                            value={nuevoRecibo.fecha_estancia_desde}
                            onChange={(e) =>
                              setNuevoRecibo((p) => ({ ...p, fecha_estancia_desde: e.target.value }))
                            }
                            className="text-gray-900"
                          />
                        </div>
                        <div>
                          <Label htmlFor="r_est_hasta">{t('receiptStayToLabel')}</Label>
                          <Input
                            id="r_est_hasta"
                            type="date"
                            value={nuevoRecibo.fecha_estancia_hasta}
                            onChange={(e) =>
                              setNuevoRecibo((p) => ({ ...p, fecha_estancia_hasta: e.target.value }))
                            }
                            className="text-gray-900"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label htmlFor="r_desc">{t('description')}</Label>
                        <p className="text-xs text-gray-600 mb-1.5">{t('receiptDescriptionHint')}</p>
                        <textarea
                          id="r_desc"
                          value={nuevoRecibo.descripcion}
                          onChange={(e) => setNuevoRecibo((p) => ({ ...p, descripcion: e.target.value }))}
                          rows={3}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-gray-800 text-sm">
                          <input
                            type="checkbox"
                            checked={nuevoRecibo.incluir_iva}
                            onChange={(e) => setNuevoRecibo((p) => ({ ...p, incluir_iva: e.target.checked }))}
                            className="rounded border-gray-300 w-4 h-4 text-emerald-600"
                          />
                          {t('receiptIncludeVat')}
                        </label>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">{t('receiptIncludeVatHelp')}</p>
                      {nuevoRecibo.incluir_iva && (
                        <div className="mt-4 max-w-xs">
                          <Label htmlFor="r_iva">{t('ivaPercent')}</Label>
                          <Input
                            id="r_iva"
                            type="number"
                            step="0.01"
                            value={nuevoRecibo.iva_porcentaje}
                            onChange={(e) =>
                              setNuevoRecibo((p) => ({
                                ...p,
                                iva_porcentaje: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="text-gray-900"
                          />
                        </div>
                      )}
                      <div className="mt-4">
                        <Label htmlFor="r_pago">{t('paymentMethod')}</Label>
                        <Input
                          id="r_pago"
                          value={nuevoRecibo.forma_pago}
                          onChange={(e) => setNuevoRecibo((p) => ({ ...p, forma_pago: e.target.value }))}
                          className="text-gray-900"
                        />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                      <h4 className="font-semibold text-gray-800 mb-3 text-center">{t('receiptSummaryTitle')}</h4>
                      {nuevoRecibo.incluir_iva ? (
                        <div className="space-y-2 text-sm max-w-sm mx-auto">
                          <div className="flex justify-between">
                            <span>{t('receiptPriceBase')}</span>
                            <span className="font-medium">{calcularBaseRecibo().toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('receiptVatLabel', { pct: nuevoRecibo.iva_porcentaje })}</span>
                            <span className="font-medium">{calcularIvaRecibo().toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between font-bold border-t pt-2">
                            <span>{t('receiptTotal')}</span>
                            <span className="text-emerald-700">{nuevoRecibo.importe_total.toFixed(2)} €</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm max-w-sm mx-auto font-semibold">
                          <span>{t('receiptTotalOnly')}</span>
                          <span className="text-emerald-700 text-lg">{nuevoRecibo.importe_total.toFixed(2)} €</span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={crearReciboSubmit}
                      disabled={savingReceipt || !nuevoRecibo.cliente_nombre || !nuevoRecibo.concepto || nuevoRecibo.importe_total <= 0}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-4 rounded-xl"
                    >
                      {savingReceipt ? t('receiptCreating') : t('receiptCreateButton')}
                    </Button>
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="historial-recibo" className="space-y-6">
              <Card className="p-6 bg-white shadow-xl rounded-xl border border-emerald-200">
                <h2 className="text-xl font-semibold text-center bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-6">
                  {t('receiptHistoryTitle')}
                </h2>
                {recibos.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <Banknote className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
                    <p className="font-medium text-gray-800">{t('noReceipts')}</p>
                    <p>{t('noReceiptsHint')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recibos.map((recibo) => (
                      <div
                        key={recibo.id}
                        className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div>
                          <h3 className="font-semibold text-gray-900">{recibo.numero_recibo}</h3>
                          <p className="text-gray-700">{recibo.cliente_nombre}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(recibo.fecha_emision).toLocaleDateString(locale)}
                          </p>
                          <p className="text-sm text-gray-700 mt-1">{recibo.concepto}</p>
                          {recibo.fecha_pago && (
                            <p className="text-xs text-gray-600 mt-1">
                              {t('receiptHistoryPaymentLine', {
                                date: formatReciboDateOnly(recibo.fecha_pago, locale),
                              })}
                            </p>
                          )}
                          {(recibo.fecha_estancia_desde || recibo.fecha_estancia_hasta) && (
                            <p className="text-xs text-gray-600">
                              {recibo.fecha_estancia_desde && recibo.fecha_estancia_hasta
                                ? t('receiptHistoryStayRange', {
                                    from: formatReciboDateOnly(recibo.fecha_estancia_desde, locale),
                                    to: formatReciboDateOnly(recibo.fecha_estancia_hasta, locale),
                                  })
                                : recibo.fecha_estancia_desde
                                  ? t('receiptHistoryStayFromOnly', {
                                      from: formatReciboDateOnly(recibo.fecha_estancia_desde, locale),
                                    })
                                  : t('receiptHistoryStayToOnly', {
                                      to: formatReciboDateOnly(recibo.fecha_estancia_hasta!, locale),
                                    })}
                            </p>
                          )}
                          {recibo.descripcion ? (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{recibo.descripcion}</p>
                          ) : null}
                          <p className="text-lg font-bold text-emerald-700 mt-1">
                            {Number(recibo.importe_total).toFixed(2)} €
                            {recibo.incluir_iva && (
                              <span className="text-xs font-normal text-gray-600 ml-2">IVA</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => descargarPdfRecibo(recibo)}
                            className="border-emerald-300 text-emerald-800"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            {t('receiptPdf')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => eliminarRecibo(recibo.id)}
                            className="border-red-200 text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
