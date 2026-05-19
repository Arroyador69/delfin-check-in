-- Token de activación/onboarding separado de reset_token (recuperación de contraseña).
-- Evita que "Olvidé mi contraseña" invalide el enlace del email de bienvenida.

ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS onboarding_magic_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS onboarding_magic_token_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenant_users_onboarding_magic_token
  ON tenant_users (onboarding_magic_token)
  WHERE onboarding_magic_token IS NOT NULL;

-- Copiar tokens legacy solo si parecen magic link (hex 64 chars), no códigos numéricos de recovery
UPDATE tenant_users
SET
  onboarding_magic_token = reset_token,
  onboarding_magic_token_expires = reset_token_expires
WHERE onboarding_magic_token IS NULL
  AND reset_token IS NOT NULL
  AND reset_token_expires > NOW()
  AND length(reset_token) >= 32
  AND reset_token ~ '^[a-f0-9]+$';
