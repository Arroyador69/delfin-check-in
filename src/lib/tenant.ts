import { sql } from '@vercel/postgres';
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export interface Tenant {
  id: string;
  name: string;
  email: string;
  plan_id: 'basic' | 'standard' | 'premium' | 'enterprise';
  max_rooms: number;
  current_rooms: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  trial_ends_at?: Date;
  config: {
    propertyName?: string;
    timezone?: string;
    language?: string;
    currency?: string;
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
