import { sql } from '@vercel/postgres';
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export interface Tenant {
  id: string;
  name: string;
  email: string;
  plan_id: 'basic' | 'standard' | 'premium' | 'enterprise' | 'free' | 'checkin' | 'pro';
  plan_type?: 'free' | 'checkin' | 'standard' | 'pro';
  max_rooms: number; // También usado como max_units_allowed
  current_rooms: number; // También usado como current_units_count
  ads_enabled?: boolean;
  legal_module?: boolean;
  country_code?: string; // Código ISO del país (ES, IT, PT, etc.)
  onboarding_status?: 'pending' | 'in_progress' | 'completed';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  trial_ends_at?: Date;
  // Nuevos campos para sistema de planes MVP
  subscription_price?: number; // Precio base de suscripción
  subscription_currency?: string;
  vat_rate?: number; // IVA según país
  base_plan_price?: number; // Precio base del plan (sin IVA)
  extra_room_price?: number; // Precio por habitación extra (solo checkin)
  max_rooms_included?: number; // Habitaciones incluidas en precio base
  subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  subscription_current_period_end?: Date;
  payment_retry_count?: number;
  last_payment_failed_at?: Date | string;
  last_payment_succeeded_at?: Date | string;
  subscription_suspended_at?: Date | string;
  next_payment_attempt_at?: Date | string;
  config: {
    propertyName?: string;
    timezone?: string;
    language?: string;
    currency?: string;
    lodgingType?: string;
    reputationGoogle?: {
      enabled?: boolean;
      reviewUrl?: string;
      guestEmailLocale?: 'es' | 'en';
    };
  };
  created_at: Date;
  updated_at: Date;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  full_name?: string;
  role: 'owner' | 'admin' | 'staff';
  last_login?: Date;
  is_active: boolean;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Crea las tablas multi-tenant si no existen
 */
export async function ensureTenantTables(): Promise<void> {
  // Crear tabla tenants
  await sql`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      plan_id VARCHAR(50) NOT NULL CHECK (plan_id IN ('basic', 'standard', 'premium', 'enterprise')),
      max_rooms INTEGER NOT NULL DEFAULT 2,
      current_rooms INTEGER NOT NULL DEFAULT 0 CHECK (current_rooms >= 0),
      stripe_customer_id VARCHAR(255) UNIQUE,
      stripe_subscription_id VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
      trial_ends_at TIMESTAMP WITH TIME ZONE,
      config JSONB DEFAULT '{
        "propertyName": "",
        "timezone": "Europe/Madrid",
        "language": "es",
        "currency": "EUR"
      }'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT valid_rooms_count CHECK (current_rooms <= max_rooms OR max_rooms = -1)
    )
  `;

  // Crear tabla tenant_users
  await sql`
    CREATE TABLE IF NOT EXISTS tenant_users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      role VARCHAR(50) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff')),
      last_login TIMESTAMP WITH TIME ZONE,
      reset_token VARCHAR(255),
      reset_token_expires TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      email_verified BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(tenant_id, email)
    )
  `;

  // Agregar campo recovery_email si no existe
  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenant_users' 
        AND column_name = 'recovery_email'
      ) THEN
        ALTER TABLE tenant_users ADD COLUMN recovery_email VARCHAR(255);
      END IF;
    END $$;
  `;

  // Crear índices
  await sql`CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(email)`;

  // Crear función de trigger para updated_at
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql'
  `;

  // Crear triggers (compatibilidad: CREATE TRIGGER no soporta IF NOT EXISTS en algunas versiones)
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenants_updated_at'
      ) THEN
        CREATE TRIGGER update_tenants_updated_at
        BEFORE UPDATE ON tenants
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END$$;
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenant_users_updated_at'
      ) THEN
        CREATE TRIGGER update_tenant_users_updated_at
        BEFORE UPDATE ON tenant_users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END$$;
  `;
}

/**
 * Crea un nuevo tenant
 */
export async function createTenant(data: {
  name: string;
  email: string;
  plan_id: 'basic' | 'standard' | 'premium' | 'enterprise';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  config?: Record<string, any>;
}): Promise<Tenant> {
  // Mapear plan_id a max_rooms
  const maxRoomsMap = {
    basic: 2,
    standard: 4,
    premium: 6,
    enterprise: -1 // ilimitado
  };

  const max_rooms = maxRoomsMap[data.plan_id];
  
  const result = await sql`
    INSERT INTO tenants (
      name, email, plan_id, max_rooms, stripe_customer_id, stripe_subscription_id, config
    ) VALUES (
      ${data.name}, 
      ${data.email}, 
      ${data.plan_id}, 
      ${max_rooms}, 
      ${data.stripe_customer_id || null}, 
      ${data.stripe_subscription_id || null}, 
      ${JSON.stringify(data.config || {})}
    ) RETURNING *
  `;

  return result.rows[0] as Tenant;
}

/**
 * Crea un usuario para un tenant
 */
export async function createTenantUser(data: {
  tenant_id: string;
  email: string;
  password_hash: string;
  full_name?: string;
  role?: 'owner' | 'admin' | 'staff';
}): Promise<TenantUser> {
  const result = await sql`
    INSERT INTO tenant_users (
      tenant_id, email, password_hash, full_name, role
    ) VALUES (
      ${data.tenant_id}, 
      ${data.email}, 
      ${data.password_hash}, 
      ${data.full_name || null}, 
      ${data.role || 'owner'}
    ) RETURNING *
  `;

  return result.rows[0] as TenantUser;
}

/**
 * Busca un tenant por email
 */
export async function findTenantByEmail(email: string): Promise<Tenant | null> {
  const result = await sql`
    SELECT * FROM tenants WHERE email = ${email} LIMIT 1
  `;

  return result.rows[0] as Tenant || null;
}

/**
 * Busca un tenant por stripe_customer_id
 */
export async function findTenantByStripeCustomer(stripe_customer_id: string): Promise<Tenant | null> {
  const result = await sql`
    SELECT * FROM tenants WHERE stripe_customer_id = ${stripe_customer_id} LIMIT 1
  `;

  return result.rows[0] as Tenant || null;
}

/**
 * Actualiza el estado de un tenant
 */
export async function updateTenantStatus(
  tenant_id: string, 
  status: 'active' | 'trial' | 'suspended' | 'cancelled'
): Promise<void> {
  await sql`
    UPDATE tenants 
    SET status = ${status}, updated_at = NOW() 
    WHERE id = ${tenant_id}
  `;
}

/**
 * Actualiza la suscripción de Stripe de un tenant
 */
export async function updateTenantStripeInfo(
  tenant_id: string,
  stripe_subscription_id: string,
  status: 'active' | 'trial' | 'suspended' | 'cancelled'
): Promise<void> {
  await sql`
    UPDATE tenants 
    SET stripe_subscription_id = ${stripe_subscription_id}, 
        status = ${status}, 
        updated_at = NOW() 
    WHERE id = ${tenant_id}
  `;
}

/**
 * Obtiene el tenant ID del usuario autenticado desde el JWT token
 */
export async function getTenantId(request: NextRequest): Promise<string | null> {
  try {
    // Obtener el token de autenticación de las cookies
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return null;
    }
    
    // Verificar el token JWT
    const payload = verifyToken(authToken);
    
    if (!payload || !payload.tenantId) {
      return null;
    }
    
    return payload.tenantId;
  } catch (error) {
    console.error('Error al obtener tenant ID:', error);
    return null;
  }
}

/**
 * Obtiene un tenant completo por ID
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  try {
    const result = await sql`
      SELECT * FROM tenants WHERE id = ${tenantId} LIMIT 1
    `;
    
    return result.rows[0] as Tenant || null;
  } catch (error) {
    console.error('Error al obtener tenant:', error);
    return null;
  }
}

/**
 * ========================================
 * FUNCIONES DE VALIDACIÓN DE PERMISOS
 * ========================================
 */

/**
 * Valida si el tenant tiene acceso al módulo legal
 * @param tenant - El tenant a validar
 * @param countryCode - Código del país requerido (opcional, para validar país específico)
 * @returns true si tiene acceso, false si no
 */
export function hasLegalModuleAccess(tenant: Tenant, countryCode?: string): boolean {
  if (!tenant.legal_module) {
    return false;
  }
  
  // Si es plan PRO, tiene acceso a todos los países
  if (tenant.plan_type === 'pro' || tenant.plan_id === 'pro') {
    return true;
  }
  
  // Si es FREE+LEGAL, solo tiene acceso al país configurado
  if (countryCode && tenant.country_code) {
    return tenant.country_code.toUpperCase() === countryCode.toUpperCase();
  }
  
  // Si no se especifica país, permitir si tiene legal_module activo
  return tenant.legal_module === true;
}

/**
 * Valida si el tenant puede crear más unidades (habitaciones/apartamentos)
 * @param tenant - El tenant a validar
 * @param currentCount - Número actual de unidades (opcional, si no se usa current_rooms)
 * @returns { canCreate: boolean, reason?: string, needsUpgrade?: boolean }
 */
export function canCreateUnit(tenant: Tenant, currentCount?: number): { 
  canCreate: boolean; 
  reason?: string;
  needsUpgrade?: boolean;
  upgradePlan?: 'checkin' | 'pro';
} {
  const planType = tenant.plan_type || 'free';
  const currentUnits = currentCount ?? tenant.current_rooms;
  
  // Plan FREE: máximo 1 unidad
  if (planType === 'free') {
    if (currentUnits > 1) {
      return {
        canCreate: false,
        reason: 'Has alcanzado el límite de 1 unidad del Plan Gratis. Actualiza a Plan Check-in o Plan Pro para añadir más.',
        needsUpgrade: true,
        upgradePlan: 'checkin'
      };
    }
    return { canCreate: true };
  }
  
  // Plan CHECKIN: ilimitado (2 €/mes por cada propiedad)
  if (planType === 'checkin') {
    return { canCreate: true };
  }

  // Plan STANDARD: 1 incluida en la cuota, luego 2 €/mes por cada extra (igual que Check-in)
  if (planType === 'standard') {
    const maxIncluded = tenant.max_rooms_included ?? 1;
    if (currentUnits >= maxIncluded) {
      return {
        canCreate: true,
        reason: `Incluye 1 propiedad en la cuota. Las adicionales son 2 €/mes cada una.`
      };
    }
    return { canCreate: true };
  }
  
  // Plan PRO: 1 incluida en la cuota, luego 2 €/mes por cada extra (igual que Check-in y Standard)
  if (planType === 'pro') {
    const maxIncluded = tenant.max_rooms_included ?? 1;
    if (currentUnits >= maxIncluded) {
      return {
        canCreate: true,
        reason: `Incluye 1 propiedad en la cuota. Las adicionales son 2 €/mes cada una.`
      };
    }
    return { canCreate: true };
  }
  
  // Fallback: usar max_rooms si existe
  const maxUnits = tenant.max_rooms;
  if (maxUnits === -1) {
    return { canCreate: true };
  }
  
  if (currentUnits >= maxUnits) {
    return {
      canCreate: false,
      reason: `Has alcanzado el límite de ${maxUnits} unidades de tu plan. Para crear más, actualiza a Plan Pro.`,
      needsUpgrade: true,
      upgradePlan: 'pro'
    };
  }
  
  return { canCreate: true };
}

/**
 * Valida si el tenant tiene anuncios habilitados
 * @param tenant - El tenant a validar
 * @returns true si tiene anuncios, false si no
 */
export function hasAdsEnabled(tenant: Tenant): boolean {
  // Si ads_enabled está explícitamente definido, usarlo
  if (tenant.ads_enabled !== undefined) {
    return tenant.ads_enabled;
  }
  // Solo Básico y Check-in tienen anuncios; Standard y Pro no
  const noAds = tenant.plan_type === 'pro' || tenant.plan_type === 'standard' ||
    tenant.plan_id === 'pro' || tenant.plan_id === 'enterprise';
  return !noAds;
}

/**
 * Obtiene la configuración del plan del tenant
 * @param tenant - El tenant
 * @returns Configuración del plan
 */
export function getPlanConfig(tenant: Tenant): {
  planType: 'free' | 'free_legal' | 'checkin' | 'standard' | 'pro';
  adsEnabled: boolean;
  legalModule: boolean;
  maxUnits: number;
  countryCode?: string;
} {
  const planType = (tenant.plan_type ||
    (tenant.plan_id === 'pro' || tenant.plan_id === 'enterprise' ? 'pro' :
     tenant.plan_id === 'premium' ? 'checkin' : 'free')) as 'free' | 'free_legal' | 'checkin' | 'standard' | 'pro';
  
  return {
    planType,
    adsEnabled: hasAdsEnabled(tenant),
    legalModule: tenant.legal_module || false,
    maxUnits: tenant.max_rooms === -1 ? Infinity : tenant.max_rooms,
    countryCode: tenant.country_code
  };
}
