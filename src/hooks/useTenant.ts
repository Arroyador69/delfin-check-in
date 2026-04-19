'use client';

import { useState, useEffect } from 'react';
import type { Tenant } from '@/lib/tenant';
import { resolveEffectivePlanType } from '@/lib/tenant-plan-billing';
import { hasCheckinInstructionsEmailPlan } from '@/lib/checkin-email-plan';

export interface TenantInfo {
  id: string;
  name: string;
  email: string;
  plan_type?: 'free' | 'free_legal' | 'checkin' | 'standard' | 'pro';
  plan_id: string;
  ads_enabled?: boolean;
  legal_module?: boolean;
  country_code?: string;
  /** ISO 4217 según país del negocio (no según idioma UI). */
  business_currency?: string;
  /** BCP 47 para Intl (idioma cuenta + región país). */
  money_format_locale?: string;
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
          } else {
            console.warn('⚠️ [useTenant] Respuesta sin tenant:', data);
            setError('No se pudo obtener información del tenant');
          }
        } else {
          console.error('❌ [useTenant] Error en respuesta:', response.status, response.statusText);
          setError('Error al obtener información del tenant');
        }
      } catch (err) {
        console.error('❌ [useTenant] Error fetching tenant:', err);
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
function effectivePlan(tenant: TenantInfo | null) {
  if (!tenant) return 'free' as const;
  return resolveEffectivePlanType({
    plan_type: tenant.plan_type as Tenant['plan_type'],
    plan_id: tenant.plan_id as Tenant['plan_id'],
  });
}

/** Plan Standard o Pro: email de instrucciones check-in al huésped (PMS y reservas directas). */
export function hasCheckinInstructionsEmailAccess(tenant: TenantInfo | null): boolean {
  if (!tenant) return false;
  return hasCheckinInstructionsEmailPlan({
    plan_type: tenant.plan_type as Tenant['plan_type'],
    plan_id: tenant.plan_id as Tenant['plan_id'],
  });
}

/** Plan gratuito: vista previa bloqueada de MIR / estado envíos (upsell). */
export function isFreePlanMirPreview(tenant: TenantInfo | null): boolean {
  return effectivePlan(tenant) === 'free';
}

/** Plan efectivo Pro (incluye respaldo por plan_id legacy enterprise/pro). */
export function isProPlanTenant(tenant: TenantInfo | null): boolean {
  if (!tenant) return false;
  return (
    resolveEffectivePlanType({
      plan_type: tenant.plan_type as Tenant['plan_type'],
      plan_id: tenant.plan_id as Tenant['plan_id'],
    }) === 'pro'
  );
}

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

