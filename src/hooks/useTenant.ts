'use client';

import { useState, useEffect } from 'react';

export interface TenantInfo {
  id: string;
  name: string;
  email: string;
  plan_type?: 'free' | 'free_legal' | 'checkin' | 'standard' | 'pro';
  plan_id: string;
  ads_enabled?: boolean;
  legal_module?: boolean;
  country_code?: string;
  max_rooms: number;
  current_rooms: number;
  status: string;
}

export interface TenantLimitsInfo {
  can_add_rooms: boolean;
  rooms_usage_percentage: number;
  rooms_remaining: number;
  limit_message: null | {
    type: string;
    message: string;
    suggestion: string;
  };
}

export function useTenant() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [limits, setLimits] = useState<TenantLimitsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenant() {
      try {
        const response = await fetch('/api/tenant', {
          credentials: 'include' // Asegurar que se envíen cookies
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.tenant) {
            console.log('📊 [useTenant] Tenant cargado:', {
              id: data.tenant.id,
              plan_type: data.tenant.plan_type,
              ads_enabled: data.tenant.ads_enabled,
              hasAds: data.tenant.plan_type === 'free' || data.tenant.plan_type === 'checkin'
            });
            setTenant(data.tenant);
            setLimits(data.limits ?? null);
          } else {
            console.warn('⚠️ [useTenant] Respuesta sin tenant:', data);
            setError('No se pudo obtener información del tenant');
            setLimits(null);
          }
        } else {
          console.error('❌ [useTenant] Error en respuesta:', response.status, response.statusText);
          setError('Error al obtener información del tenant');
          setLimits(null);
        }
      } catch (err) {
        console.error('❌ [useTenant] Error fetching tenant:', err);
        setError('Error de conexión');
        setLimits(null);
      } finally {
        setLoading(false);
      }
    }

    fetchTenant();
  }, []);

  return { tenant, limits, loading, error };
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
  // Si ads_enabled está explícitamente definido, usarlo
  if (tenant.ads_enabled !== undefined) {
    return tenant.ads_enabled;
  }
  // Solo Básico y Check-in tienen anuncios; Standard y Pro no
  return tenant.plan_type === 'free' || tenant.plan_type === 'checkin';
}

/**
 * Helper para obtener el tipo de plan legible
 */
export function getPlanName(tenant: TenantInfo | null): string {
  if (!tenant) return 'Desconocido';
  
  const planType = tenant.plan_type ||
    (tenant.plan_id === 'pro' || tenant.plan_id === 'enterprise' ? 'pro' :
     tenant.plan_id === 'standard' ? 'standard' :
     tenant.plan_id === 'premium' ? 'checkin' : 'free');
  
  const planNames: Record<string, string> = {
    free: 'Básico',
    free_legal: 'FREE + LEGAL',
    checkin: 'Check-in',
    standard: 'Standard',
    pro: 'Pro'
  };
  
  return planNames[planType] || planType;
}

