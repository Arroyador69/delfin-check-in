'use client';

import { useState, useEffect } from 'react';

export interface TenantInfo {
  id: string;
  name: string;
  email: string;
  plan_type?: 'free' | 'free_legal' | 'pro';
  plan_id: string;
  ads_enabled?: boolean;
  legal_module?: boolean;
  country_code?: string;
  max_rooms: number;
  current_rooms: number;
  status: string;
}

export function useTenant() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenant() {
      try {
        const response = await fetch('/api/tenant');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.tenant) {
            setTenant(data.tenant);
          } else {
            setError('No se pudo obtener información del tenant');
          }
        } else {
          setError('Error al obtener información del tenant');
        }
      } catch (err) {
        console.error('Error fetching tenant:', err);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    }

    fetchTenant();
  }, []);

  return { tenant, loading, error };
}

/**
 * Helper para verificar si el tenant tiene acceso al módulo legal
 */
export function hasLegalModule(tenant: TenantInfo | null): boolean {
  if (!tenant) return false;
  return tenant.legal_module === true;
}

/**
 * Helper para verificar si el tenant tiene anuncios habilitados
 */
export function hasAds(tenant: TenantInfo | null): boolean {
  if (!tenant) return false;
  if (tenant.ads_enabled !== undefined) {
    return tenant.ads_enabled;
  }
  // Fallback: PRO no tiene anuncios
  return tenant.plan_type !== 'pro' && tenant.plan_id !== 'pro';
}

/**
 * Helper para obtener el tipo de plan legible
 */
export function getPlanName(tenant: TenantInfo | null): string {
  if (!tenant) return 'Desconocido';
  
  const planType = tenant.plan_type || 
    (tenant.plan_id === 'pro' ? 'pro' : 
     tenant.plan_id === 'premium' ? 'free_legal' : 'free');
  
  const planNames: Record<string, string> = {
    free: 'FREE',
    free_legal: 'FREE + LEGAL',
    pro: 'PRO'
  };
  
  return planNames[planType] || planType;
}

