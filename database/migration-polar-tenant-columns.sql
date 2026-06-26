-- Columnas Polar en tenants (persistencia de suscripciones y reconciliación).
-- Ejecutar en Neon producción si el webhook aún no las creó en runtime.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_checkout_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_subscription_status TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_last_event_at TIMESTAMPTZ;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_last_upgrade_intent_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_last_checkout_context JSONB;

CREATE INDEX IF NOT EXISTS idx_tenants_polar_subscription_id ON tenants (polar_subscription_id)
  WHERE polar_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_polar_customer_id ON tenants (polar_customer_id)
  WHERE polar_customer_id IS NOT NULL;
