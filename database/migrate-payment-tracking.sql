-- ========================================
-- MIGRACIÓN: Sistema de Gestión de Pagos y Suspensiones
-- ========================================
-- Fecha: 2025-01-XX
-- Descripción: Añade campos para tracking de pagos, reintentos y facturas pendientes

-- ========================================
-- PASO 1: Añadir campos a tabla tenants
-- ========================================

-- Campos para tracking de pagos fallidos
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_succeeded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'unpaid', 'canceled', 'trialing')),
ADD COLUMN IF NOT EXISTS subscription_suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_payment_attempt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_invoice_id VARCHAR(255);

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_next_payment_attempt ON tenants(next_payment_attempt_at);
CREATE INDEX IF NOT EXISTS idx_tenants_payment_retry_count ON tenants(payment_retry_count);

-- ========================================
-- PASO 2: Tabla para tracking de intentos de pago
-- ========================================

CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  failure_reason TEXT,
  failure_code VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, stripe_invoice_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_tenant_id ON payment_attempts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_invoice_id ON payment_attempts(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_created ON payment_attempts(created_at);

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_payment_attempts_updated_at ON payment_attempts;
CREATE TRIGGER update_payment_attempts_updated_at 
  BEFORE UPDATE ON payment_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- PASO 3: Tabla para facturas pendientes de Stripe
-- ========================================

CREATE TABLE IF NOT EXISTS stripe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  invoice_number TEXT,
  amount_due DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  status VARCHAR(255) NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
  due_date TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  attempt_count INTEGER DEFAULT 0,
  next_payment_attempt TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(stripe_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_invoices_tenant_id ON stripe_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_status ON stripe_invoices(status);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_due_date ON stripe_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_next_attempt ON stripe_invoices(next_payment_attempt);

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_stripe_invoices_updated_at ON stripe_invoices;
CREATE TRIGGER update_stripe_invoices_updated_at 
  BEFORE UPDATE ON stripe_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- PASO 4: Tabla para notificaciones de pago enviadas
-- ========================================

CREATE TABLE IF NOT EXISTS payment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('payment_failed', 'payment_retry', 'suspension_warning', 'suspended', 'payment_succeeded')),
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  email_address VARCHAR(255),
  subject TEXT,
  body TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_notifications_tenant_id ON payment_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_type ON payment_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_created ON payment_notifications(created_at);

-- ========================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ========================================

COMMENT ON TABLE payment_attempts IS 'Registra cada intento de pago de facturas de Stripe';
COMMENT ON TABLE stripe_invoices IS 'Facturas de Stripe sincronizadas con el sistema';
COMMENT ON TABLE payment_notifications IS 'Notificaciones de pago enviadas a tenants';
COMMENT ON COLUMN tenants.payment_retry_count IS 'Número de intentos de pago fallidos consecutivos';
COMMENT ON COLUMN tenants.subscription_status IS 'Estado de la suscripción en Stripe';
COMMENT ON COLUMN tenants.subscription_suspended_at IS 'Fecha en que se suspendió la suscripción por falta de pago';

