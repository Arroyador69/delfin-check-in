'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OnboardingStatus {
  onboardingCompleto: boolean;
  dpaAceptado: boolean;
  empresaConfigurada: boolean;
  mirConfigurado: boolean;
}

export default function OnboardingStatus() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/onboarding/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error verificando estado del onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  if (status.onboardingCompleto) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-2xl">✅</span>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-green-800">
              Configuración Completa
            </h3>
            <p className="text-green-700">
              Su sistema está completamente configurado y listo para recibir registros de huéspedes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-yellow-800">
            Configuración Pendiente
          </h3>
          <p className="text-yellow-700 mb-4">
            Complete la configuración inicial para poder utilizar todas las funcionalidades del sistema.
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <span className={`w-4 h-4 rounded-full mr-2 ${status.dpaAceptado ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              <span className="text-sm text-yellow-800">
                {status.dpaAceptado ? '✅' : '❌'} Contrato DPA
              </span>
            </div>
            <div className="flex items-center">
              <span className={`w-4 h-4 rounded-full mr-2 ${status.empresaConfigurada ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              <span className="text-sm text-yellow-800">
                {status.empresaConfigurada ? '✅' : '❌'} Datos de Empresa
              </span>
            </div>
            <div className="flex items-center">
              <span className={`w-4 h-4 rounded-full mr-2 ${status.mirConfigurado ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              <span className="text-sm text-yellow-800">
                {status.mirConfigurado ? '✅' : '❌'} Configuración MIR
              </span>
            </div>
          </div>
          
          <div className="mt-4">
            <Link
              href="/onboarding"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Completar Configuración
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}





















