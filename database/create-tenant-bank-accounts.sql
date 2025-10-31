-- =====================================================
-- TABLA: TENANT_BANK_ACCOUNTS
-- Almacenamiento de cuentas bancarias de propietarios
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_bank_accounts (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Información bancaria básica
  iban VARCHAR(50) NOT NULL,
  bank_name VARCHAR(255),
  account_holder_name VARCHAR(255),
  swift_bic VARCHAR(20), -- Opcional, para transferencias internacionales
  
  -- Integración con Stripe
  stripe_account_id VARCHAR(255) UNIQUE, -- ID de External Account en Stripe
  stripe_customer_id VARCHAR(255), -- Customer ID del tenant en Stripe
  
  -- Estado y verificación
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(50) DEFAULT 'pending', -- pending, verified, failed
  is_default BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Configuración de moneda
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_tenant_bank_accounts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, iban) -- Un IBAN solo puede estar registrado una vez por tenant
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_tenant_bank_accounts_tenant_id ON tenant_bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_bank_accounts_stripe_account_id ON tenant_bank_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_tenant_bank_accounts_is_default ON tenant_bank_accounts(tenant_id, is_default);
CREATE INDEX IF NOT EXISTS idx_tenant_bank_accounts_is_active ON tenant_bank_accounts(is_active);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_tenant_bank_accounts_updated_at 
  BEFORE UPDATE ON tenant_bank_accounts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para asegurar que solo haya una cuenta por defecto
CREATE OR REPLACE FUNCTION ensure_single_default_bank_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Si estamos marcando una cuenta como default, desmarcar las demás
  IF NEW.is_default = TRUE THEN
    UPDATE tenant_bank_accounts
    SET is_default = FALSE
    WHERE tenant_id = NEW.tenant_id 
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_bank_account
  BEFORE INSERT OR UPDATE ON tenant_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_bank_account();

-- Comentarios para documentación
COMMENT ON TABLE tenant_bank_accounts IS 'Cuentas bancarias de propietarios para transferencias automáticas';
COMMENT ON COLUMN tenant_bank_accounts.stripe_account_id IS 'ID de External Account en Stripe, usado para transfers automáticos';
COMMENT ON COLUMN tenant_bank_accounts.verification_status IS 'Estado de verificación: pending, verified, failed';

-- =====================================================
-- VISTA: TENANTS CON CUENTA BANCARIA VERIFICADA
-- =====================================================

CREATE OR REPLACE VIEW tenants_with_verified_bank_account AS
SELECT 
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.email AS tenant_email,
  tba.id AS bank_account_id,
  tba.iban,
  tba.bank_name,
  tba.account_holder_name,
  tba.stripe_account_id,
  tba.is_default,
  tba.created_at AS bank_account_added_at
FROM tenants t
INNER JOIN tenant_bank_accounts tba ON t.id = tba.tenant_id
WHERE tba.is_active = TRUE 
  AND tba.verification_status = 'verified';

COMMENT ON VIEW tenants_with_verified_bank_account IS 'Lista de propietarios con cuentas bancarias verificadas para recibir pagos';

