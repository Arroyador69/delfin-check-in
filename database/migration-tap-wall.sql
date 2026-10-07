-- Delfín Tap Wall: suscripción aparte (10€/mes + 2€/propiedad extra),
-- espacios NFC/WiFi y avisos de emergencia del huésped.

CREATE TABLE IF NOT EXISTS tap_wall_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  polar_subscription_id TEXT,
  polar_customer_id TEXT,
  polar_checkout_id TEXT,
  properties_count INT NOT NULL DEFAULT 1 CHECK (properties_count >= 1 AND properties_count <= 200),
  product_sku TEXT NOT NULL DEFAULT 'instructions_nfc',
  shipping_name TEXT,
  shipping_line1 TEXT,
  shipping_line2 TEXT,
  shipping_city TEXT,
  shipping_postal TEXT,
  shipping_country TEXT NOT NULL DEFAULT 'ES',
  shipping_phone TEXT,
  terms_version TEXT,
  terms_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tap_wall_accounts_tenant_uidx
  ON tap_wall_accounts (tenant_id)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tap_wall_accounts_email_idx
  ON tap_wall_accounts (lower(email));

CREATE TABLE IF NOT EXISTS tap_wall_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES tap_wall_accounts(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  public_code TEXT NOT NULL UNIQUE,
  wifi_ssid TEXT,
  wifi_password TEXT,
  wifi_notes TEXT,
  instructions_text TEXT,
  emergency_phone TEXT,
  emergency_message TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tap_wall_spaces_account_idx ON tap_wall_spaces (account_id);

CREATE TABLE IF NOT EXISTS tap_wall_emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES tap_wall_spaces(id) ON DELETE CASCADE,
  guest_message TEXT NOT NULL,
  guest_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tap_wall_emergencies_space_idx
  ON tap_wall_emergencies (space_id, created_at DESC);
