-- Incidencias de soporte (software): los tenants envían casos; el superadmin los gestiona.
-- Ejecutar en la misma base que tenants / tenant_users (p. ej. Neon / Vercel Postgres).

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  reporter_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(48) NOT NULL DEFAULT 'software_issue',
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  superadmin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_tickets_status_check CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  CONSTRAINT support_tickets_category_check CHECK (category IN (
    'software_issue',
    'integration_error',
    'data_export',
    'account_access',
    'other_technical'
  ))
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

COMMENT ON TABLE support_tickets IS 'Casos de soporte técnico del producto, visibles para el tenant emisor y gestionados por superadmin.';
