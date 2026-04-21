-- Enlace de reseña de Google por propiedad (multi-tenant)
-- Ejecutar en Neon / Postgres del proyecto.

ALTER TABLE tenant_properties
  ADD COLUMN IF NOT EXISTS google_review_url TEXT;

COMMENT ON COLUMN tenant_properties.google_review_url IS
  'Enlace para dejar reseña en Google (por propiedad). Si está vacío, se puede usar el enlace global en tenants.config.reputationGoogle.reviewUrl como fallback.';

CREATE INDEX IF NOT EXISTS idx_tenant_properties_google_review_url
  ON tenant_properties (tenant_id, id)
  WHERE google_review_url IS NOT NULL AND BTRIM(google_review_url) <> '';

