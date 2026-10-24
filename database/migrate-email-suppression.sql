-- Ampliar email_unsubscribes para suppression (bounces Zoho, tenant inactivo, etc.)
ALTER TABLE email_unsubscribes ADD COLUMN IF NOT EXISTS source VARCHAR(80);
ALTER TABLE email_unsubscribes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE email_unsubscribes
SET created_at = COALESCE(created_at, unsubscribed_at, NOW())
WHERE created_at IS NULL;

COMMENT ON TABLE email_unsubscribes IS
  'Suppression global por email: unsubscribe | bounce | tenant_inactive | manual';
