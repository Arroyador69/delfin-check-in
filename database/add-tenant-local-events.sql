-- Migration: Add tenant_id to local_events for multi-tenant support
-- Also add category and type fields for better event classification

ALTER TABLE local_events ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE local_events ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE local_events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE local_events ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;

CREATE INDEX IF NOT EXISTS idx_local_events_tenant ON local_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_local_events_tenant_date ON local_events(tenant_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_local_events_category ON local_events(category);
