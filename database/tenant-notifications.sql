-- Notificaciones en app para tenants (campana).

CREATE TABLE IF NOT EXISTS tenant_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(48) NOT NULL DEFAULT 'generic',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenant_notifications_tenant_unread ON tenant_notifications(tenant_id, is_read, created_at DESC);

