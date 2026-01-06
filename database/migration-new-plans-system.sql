-- ========================================
-- MIGRACIÓN: Nuevo Sistema de Planes MVP
-- ========================================
-- Planes: FREE (0€, 2 hab), CHECKIN (8€ + 4€/hab, ilimitado), PRO (29,99€, 6 hab base)
-- Fecha: 2026-01-06

-- ========================================
-- 1. TABLA COUNTRIES (IVA por país)
-- ========================================
CREATE TABLE IF NOT EXISTS countries (
  code VARCHAR(2) PRIMARY KEY, -- ISO 3166-1 alpha-2 (ES, IT, PT, etc.)
  name_es VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL, -- Tasa de IVA (21.00, 22.00, etc.)
  currency VARCHAR(3) DEFAULT 'EUR',
  legal_module_required BOOLEAN DEFAULT false, -- Si requiere check-in digital obligatorio
  legal_api_endpoint TEXT, -- Endpoint de API para check-in (si aplica)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar países iniciales
INSERT INTO countries (code, name_es, name_en, vat_rate, currency, legal_module_required) VALUES
  ('ES', 'España', 'Spain', 21.00, 'EUR', true),
  ('IT', 'Italia', 'Italy', 22.00, 'EUR', true),
  ('PT', 'Portugal', 'Portugal', 23.00, 'EUR', false)
ON CONFLICT (code) DO UPDATE SET
  vat_rate = EXCLUDED.vat_rate,
  legal_module_required = EXCLUDED.legal_module_required,
  updated_at = NOW();

-- ========================================
-- 2. ACTUALIZAR TABLA TENANTS
-- ========================================
ALTER TABLE tenants
  -- Actualizar plan_type a nuevos valores
  DROP CONSTRAINT IF EXISTS tenants_plan_type_check;
  
ALTER TABLE tenants
  ADD CONSTRAINT tenants_plan_type_check 
  CHECK (plan_type IN ('free', 'checkin', 'pro'));

-- Añadir campos de suscripción y precios
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subscription_price DECIMAL(10,2), -- Precio base de suscripción (8€ o 29,99€)
  ADD COLUMN IF NOT EXISTS subscription_currency VARCHAR(3) DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 21.00, -- IVA según país
  ADD COLUMN IF NOT EXISTS base_plan_price DECIMAL(10,2), -- Precio base del plan (sin IVA)
  ADD COLUMN IF NOT EXISTS extra_room_price DECIMAL(10,2) DEFAULT 4.00, -- Precio por habitación extra (solo checkin)
  ADD COLUMN IF NOT EXISTS max_rooms_included INTEGER DEFAULT 2, -- Habitaciones incluidas en precio base
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;

-- Actualizar constraint de plan_id para incluir nuevos planes
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_plan_id_check;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_plan_id_check 
  CHECK (plan_id IN ('basic', 'standard', 'premium', 'enterprise', 'free', 'checkin', 'pro'));

-- ========================================
-- 3. TABLA PLANES (Configuración centralizada)
-- ========================================
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(50) PRIMARY KEY, -- 'free', 'checkin', 'pro'
  name_es VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  base_price_eur DECIMAL(10,2) NOT NULL, -- Precio base sin IVA
  extra_room_price_eur DECIMAL(10,2), -- Precio por habitación extra (NULL = no aplica)
  max_rooms_included INTEGER, -- Habitaciones incluidas (NULL = ilimitado)
  max_rooms_total INTEGER, -- Máximo total de habitaciones (NULL = ilimitado)
  ads_enabled BOOLEAN DEFAULT true,
  legal_module BOOLEAN DEFAULT false,
  direct_reservations BOOLEAN DEFAULT true, -- Todos los planes tienen reservas directas
  commission_rate DECIMAL(5,2) DEFAULT 9.00, -- 9% fee en reservas directas
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar planes
INSERT INTO plans (id, name_es, name_en, base_price_eur, extra_room_price_eur, max_rooms_included, max_rooms_total, ads_enabled, legal_module) VALUES
  ('free', 'Plan Gratis', 'Free Plan', 0.00, NULL, 2, 2, true, false),
  ('checkin', 'Plan Check-in', 'Check-in Plan', 8.00, 4.00, 2, NULL, true, true),
  ('pro', 'Plan Pro', 'Pro Plan', 29.99, NULL, 6, NULL, false, true)
ON CONFLICT (id) DO UPDATE SET
  base_price_eur = EXCLUDED.base_price_eur,
  extra_room_price_eur = EXCLUDED.extra_room_price_eur,
  max_rooms_included = EXCLUDED.max_rooms_included,
  max_rooms_total = EXCLUDED.max_rooms_total,
  ads_enabled = EXCLUDED.ads_enabled,
  legal_module = EXCLUDED.legal_module,
  updated_at = NOW();

-- ========================================
-- 4. TABLA SUBSCRIPTIONS (Seguimiento de suscripciones)
-- ========================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  base_price DECIMAL(10,2) NOT NULL, -- Precio base sin IVA
  vat_rate DECIMAL(5,2) NOT NULL, -- IVA aplicado
  vat_amount DECIMAL(10,2) NOT NULL, -- Cantidad de IVA
  total_price DECIMAL(10,2) NOT NULL, -- Precio total con IVA
  currency VARCHAR(3) DEFAULT 'EUR',
  room_count INTEGER DEFAULT 0, -- Número de habitaciones (para plan checkin)
  extra_rooms_price DECIMAL(10,2) DEFAULT 0, -- Precio de habitaciones extra
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ========================================
-- 5. TABLA TENANT_COSTS (Gastos por tenant para superadmin)
-- ========================================
CREATE TABLE IF NOT EXISTS tenant_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cost_type VARCHAR(50) NOT NULL CHECK (cost_type IN ('stripe_fee', 'commission', 'refund', 'chargeback', 'other')),
  amount DECIMAL(10,2) NOT NULL, -- Cantidad (siempre positiva)
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  stripe_transaction_id VARCHAR(255), -- ID de transacción de Stripe si aplica
  reservation_id UUID, -- ID de reserva si aplica
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_costs_tenant_id ON tenant_costs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_costs_created_at ON tenant_costs(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_costs_cost_type ON tenant_costs(cost_type);

-- ========================================
-- 6. TABLA TENANT_REVENUES (Ingresos por tenant)
-- ========================================
CREATE TABLE IF NOT EXISTS tenant_revenues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  revenue_type VARCHAR(50) NOT NULL CHECK (revenue_type IN ('subscription', 'commission', 'other')),
  amount DECIMAL(10,2) NOT NULL, -- Cantidad (siempre positiva)
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  stripe_transaction_id VARCHAR(255),
  subscription_id UUID REFERENCES subscriptions(id),
  reservation_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_revenues_tenant_id ON tenant_revenues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_revenues_created_at ON tenant_revenues(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_revenues_revenue_type ON tenant_revenues(revenue_type);

-- ========================================
-- 7. MIGRAR DATOS EXISTENTES
-- ========================================
-- Actualizar tenants existentes según su plan_id actual
UPDATE tenants
SET 
  plan_type = CASE 
    WHEN plan_id IN ('basic', 'standard') THEN 'free'
    WHEN plan_id = 'premium' THEN 'checkin'
    WHEN plan_id = 'enterprise' THEN 'pro'
    ELSE COALESCE(plan_type, 'free')
  END,
  ads_enabled = CASE 
    WHEN plan_id = 'enterprise' OR plan_type = 'pro' THEN false
    ELSE COALESCE(ads_enabled, true)
  END,
  legal_module = CASE 
    WHEN plan_id IN ('premium', 'enterprise') OR plan_type IN ('checkin', 'pro') THEN true
    ELSE COALESCE(legal_module, false)
  END,
  max_rooms_included = CASE
    WHEN plan_type = 'free' THEN 2
    WHEN plan_type = 'checkin' THEN 2
    WHEN plan_type = 'pro' THEN 6
    ELSE COALESCE(max_rooms_included, 2)
  END,
  base_plan_price = CASE
    WHEN plan_type = 'free' THEN 0.00
    WHEN plan_type = 'checkin' THEN 8.00
    WHEN plan_type = 'pro' THEN 29.99
    ELSE NULL
  END,
  extra_room_price = CASE
    WHEN plan_type = 'checkin' THEN 4.00
    ELSE NULL
  END,
  vat_rate = COALESCE(
    (SELECT vat_rate FROM countries WHERE code = tenants.country_code LIMIT 1),
    21.00 -- Default España
  )
WHERE plan_type IS NULL OR base_plan_price IS NULL;

-- ========================================
-- 8. COMENTARIOS PARA DOCUMENTACIÓN
-- ========================================
COMMENT ON TABLE countries IS 'Países y configuración de IVA y regulaciones legales';
COMMENT ON TABLE plans IS 'Configuración centralizada de planes disponibles';
COMMENT ON TABLE subscriptions IS 'Suscripciones activas de tenants con Stripe';
COMMENT ON TABLE tenant_costs IS 'Gastos por tenant (Stripe fees, comisiones, etc.) para control de superadmin';
COMMENT ON TABLE tenant_revenues IS 'Ingresos por tenant (suscripciones, comisiones) para control de superadmin';
COMMENT ON COLUMN tenants.max_rooms_included IS 'Habitaciones incluidas en el precio base del plan';
COMMENT ON COLUMN tenants.extra_room_price IS 'Precio por habitación adicional (solo para plan checkin)';
COMMENT ON COLUMN plans.max_rooms_total IS 'Máximo total de habitaciones permitidas (NULL = ilimitado)';

