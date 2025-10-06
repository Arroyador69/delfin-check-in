'use client';

import { useState, useEffect } from 'react';

interface Comunicacion {
  id: string;
  timestamp: string;
  datos: any;
  resultado: any;
  estado: 'pendiente' | 'enviado' | 'confirmado' | 'error';
  lote: string | null;
  error: string | null;
}

interface EstadoEnvios {
  estadisticas: {
    total: number;
    pendientes: number;
    enviados: number;
    confirmados: number;
    errores: number;
  };
  comunicaciones: {
    pendientes: Comunicacion[];
    enviados: Comunicacion[];
    confirmados: Comunicacion[];
    errores: Comunicacion[];
  };
}

export default function EstadoEnviosMIR() {
  const [estado, setEstado] = useState<EstadoEnvios | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<'pendientes' | 'enviados' | 'confirmados' | 'errores'>('pendientes');

  useEffect(() => {
    cargarEstado();
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarEstado, 30000);
    return () => clearInterval(interval);
  }, []);

  const cargarEstado = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ministerio/estado-envios');
      const data = await response.json();
      
      if (data.success) {
        setEstado(data);
        setError(null);
      } else {
        setError(data.message || 'Error cargando estado');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error cargando estado:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'enviado': return 'bg-blue-100 text-blue-800';
      case 'confirmado': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'enviado': return 'Enviado';
      case 'confirmado': return 'Confirmado';
      case 'error': return 'Error';
      default: return 'Desconocido';
    }
  };

  const formatearFecha = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-ES');
  };

  if (loading && !estado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando estado de envíos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={cargarEstado}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'pendientes', label: 'Pendientes', count: estado?.estadisticas.pendientes || 0 },
    { id: 'enviados', label: 'Enviados', count: estado?.estadisticas.enviados || 0 },
    { id: 'confirmados', label: 'Confirmados', count: estado?.estadisticas.confirmados || 0 },
    { id: 'errores', label: 'Errores', count: estado?.estadisticas.errores || 0 }
  ] as const;

  const comunicacionesActivas = estado?.comunicaciones[tabActiva] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Estado de Envíos al MIR</h1>
              <p className="mt-2 text-gray-600">🏛️ Seguimiento de comunicaciones al Ministerio del Interior</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={cargarEstado}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Actualizando...' : 'Actualizar'}
              </button>
              <div className="text-sm text-gray-500">
                Última actualización: {estado ? formatearFecha(estado.timestamp) : 'Nunca'}
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 transition-all duration-500 hover:transform hover:-translate-y-1 hover:shadow-2xl">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-semibold text-gray-900">{estado?.estadisticas.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 transition-all duration-500 hover:transform hover:-translate-y-1 hover:shadow-2xl">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 font-semibold">⏳</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pendientes</p>
                <p className="text-2xl font-semibold text-gray-900">{estado?.estadisticas.pendientes || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 transition-all duration-500 hover:transform hover:-translate-y-1 hover:shadow-2xl">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">✅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Confirmados</p>
                <p className="text-2xl font-semibold text-gray-900">{estado?.estadisticas.confirmados || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 transition-all duration-500 hover:transform hover:-translate-y-1 hover:shadow-2xl">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-semibold">❌</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Errores</p>
                <p className="text-2xl font-semibold text-gray-900">{estado?.estadisticas.errores || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow transition-all duration-500 hover:transform hover:-translate-y-1 hover:shadow-2xl">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    tabActiva === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs transition-all duration-200 ${
                    tabActiva === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Contenido de las tabs */}
          <div className="p-6">
            {comunicacionesActivas.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay comunicaciones</h3>
                <p className="mt-1 text-sm text-gray-500">No se encontraron comunicaciones en este estado.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comunicacionesActivas.map((comunicacion) => (
                  <div key={comunicacion.id} className="border border-gray-200 rounded-lg p-4 transition-all duration-500 hover:transform hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(comunicacion.estado)}`}>
                          {getEstadoTexto(comunicacion.estado)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">ID: {comunicacion.id}</p>
                          <p className="text-sm text-gray-500">{formatearFecha(comunicacion.timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {comunicacion.lote && (
                          <p className="text-sm text-gray-600">Lote: {comunicacion.lote}</p>
                        )}
                        {comunicacion.error && (
                          <p className="text-sm text-red-600">Error: {comunicacion.error}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Detalles de la comunicación */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Referencia:</p>
                        <p className="text-gray-600">{comunicacion.datos?.comunicaciones?.[0]?.contrato?.referencia || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Viajeros:</p>
                        <p className="text-gray-600">{comunicacion.datos?.comunicaciones?.[0]?.personas?.length || 0}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Fecha Entrada:</p>
                        <p className="text-gray-600">
                          {comunicacion.datos?.comunicaciones?.[0]?.contrato?.fechaEntrada 
                            ? new Date(comunicacion.datos.comunicaciones[0].contrato.fechaEntrada).toLocaleDateString('es-ES')
                            : 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Fecha Salida:</p>
                        <p className="text-gray-600">
                          {comunicacion.datos?.comunicaciones?.[0]?.contrato?.fechaSalida 
                            ? new Date(comunicacion.datos.comunicaciones[0].contrato.fechaSalida).toLocaleDateString('es-ES')
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Resultado del MIR */}
                    {comunicacion.resultado && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-700 mb-2">Respuesta del MIR:</p>
                        <pre className="text-xs text-gray-600 overflow-x-auto">
                          {JSON.stringify(comunicacion.resultado, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
