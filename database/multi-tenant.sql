-- ========================================
-- ESQUEMA MULTI-TENANT PARA DELFÍN CHECK-IN
-- ========================================
-- Este archivo define las tablas necesarias para convertir
-- el sistema en un SaaS multi-tenant donde cada cliente
-- tiene su propia "instancia" con datos aislados

-- ========================================
-- TABLA: tenants (Clientes/Propietarios)
-- ========================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Información básica
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  
  -- Plan y límites
  plan_id VARCHAR(50) NOT NULL CHECK (plan_id IN ('basic', 'standard', 'premium', 'enterprise')),
  max_rooms INTEGER NOT NULL DEFAULT 2,
  current_rooms INTEGER NOT NULL DEFAULT 0 CHECK (current_rooms >= 0),
  
  -- Integración con Stripe
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255),
  
  -- Estado de la cuenta
  status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Configuración específica del tenant (JSON)
  config JSONB DEFAULT '{
    "propertyName": "",
    "timezone": "Europe/Madrid",
    "language": "es",
    "currency": "EUR"
  }'::jsonb,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para rendimiento
  CONSTRAINT valid_rooms_count CHECK (current_rooms <= max_rooms OR max_rooms = -1)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE tenants IS 'Almacena información de cada cliente/propietario del SaaS';
COMMENT ON COLUMN tenants.plan_id IS 'Plan de suscripción: basic, standard, premium, enterprise';
COMMENT ON COLUMN tenants.max_rooms IS 'Número máximo de habitaciones según plan (-1 = ilimitado)';
COMMENT ON COLUMN tenants.current_rooms IS 'Número actual de habitaciones configuradas';
COMMENT ON COLUMN tenants.status IS 'Estado de la cuenta: active, trial, suspended, cancelled';
COMMENT ON COLUMN tenants.config IS 'Configuración personalizada del tenant en formato JSON';
