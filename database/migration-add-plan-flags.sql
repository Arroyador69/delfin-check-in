-- ========================================
-- MIGRACIÓN: Sistema de Planes Basado en Flags
-- ========================================
-- Agrega campos para sistema flexible de planes sin crear nuevas tablas
-- Planes: FREE, FREE+LEGAL, PRO

-- Agregar nuevos campos a la tabla tenants
ALTER TABLE tenants
  -- Plan type: 'free', 'free_legal', 'pro'
  ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'free' CHECK (plan_type IN ('free', 'free_legal', 'pro')),
  
  -- Flags de funcionalidades
  ADD COLUMN IF NOT EXISTS ads_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS legal_module BOOLEAN DEFAULT false,
  
  -- País para módulo legal (código ISO 2 letras: ES, IT, PT, etc.)
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
  
  -- Límites de unidades (habitaciones/apartamentos)
  -- max_rooms ya existe, pero lo renombramos conceptualmente a max_units_allowed
  -- current_rooms ya existe, pero lo renombramos conceptualmente a current_units_count
  -- Usaremos max_rooms y current_rooms como max_units_allowed y current_units_count
  
  -- Estado de onboarding
  ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(50) DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'in_progress', 'completed'));

-- Actualizar constraint de plan_id para incluir los nuevos planes
-- Nota: Mantenemos plan_id por compatibilidad, pero plan_type es el campo principal
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_plan_id_check;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_plan_id_check 
  CHECK (plan_id IN ('basic', 'standard', 'premium', 'enterprise', 'free', 'free_legal', 'pro'));

-- Crear índices para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_tenants_plan_type ON tenants(plan_type);
CREATE INDEX IF NOT EXISTS idx_tenants_ads_enabled ON tenants(ads_enabled);
CREATE INDEX IF NOT EXISTS idx_tenants_legal_module ON tenants(legal_module);
CREATE INDEX IF NOT EXISTS idx_tenants_country_code ON tenants(country_code);
CREATE INDEX IF NOT EXISTS idx_tenants_onboarding_status ON tenants(onboarding_status);

-- Migrar datos existentes: establecer valores por defecto según plan_id actual
UPDATE tenants
SET 
  plan_type = CASE 
    WHEN plan_id IN ('basic', 'standard') THEN 'free'
    WHEN plan_id = 'premium' THEN 'free_legal'
    WHEN plan_id = 'enterprise' THEN 'pro'
    ELSE 'free'
  END,
  ads_enabled = CASE 
    WHEN plan_id = 'enterprise' THEN false
    ELSE true
  END,
  legal_module = CASE 
    WHEN plan_id IN ('premium', 'enterprise') THEN true
    ELSE false
  END
WHERE plan_type IS NULL OR plan_type = 'free';

-- Comentarios para documentación
COMMENT ON COLUMN tenants.plan_type IS 'Tipo de plan: free (gratuito con anuncios), free_legal (gratuito + módulo legal), pro (sin anuncios, todos los módulos)';
COMMENT ON COLUMN tenants.ads_enabled IS 'Si los anuncios están habilitados (true para FREE y FREE+LEGAL, false para PRO)';
COMMENT ON COLUMN tenants.legal_module IS 'Si el módulo de registro de viajeros está habilitado';
COMMENT ON COLUMN tenants.country_code IS 'Código ISO del país para el módulo legal (ES, IT, PT, etc.). NULL = todos los países (solo PRO)';
COMMENT ON COLUMN tenants.onboarding_status IS 'Estado del proceso de onboarding: pending, in_progress, completed';

-- ========================================
-- TABLA: waitlist (Lista de espera)
-- ========================================
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  
  -- Metadata adicional
  source VARCHAR(100), -- 'landing', 'referral', etc.
  notes TEXT
);

-- Índices para waitlist
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_activated_at ON waitlist(activated_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_id ON waitlist(tenant_id);

COMMENT ON TABLE waitlist IS 'Lista de espera de usuarios interesados en el PMS';
COMMENT ON COLUMN waitlist.activated_at IS 'Fecha en que se activó la cuenta (NULL = aún en waitlist)';
COMMENT ON COLUMN waitlist.tenant_id IS 'ID del tenant creado cuando se activa (NULL = aún en waitlist)';

