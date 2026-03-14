-- Crear tabla local_events completa con soporte multi-tenant
CREATE TABLE IF NOT EXISTS local_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP,
  venue TEXT,
  city TEXT,
  url TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  category TEXT DEFAULT 'other',
  impact_level SMALLINT DEFAULT 0,
  attendees_estimate INTEGER,
  distance_km NUMERIC(5,2),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_events_tenant ON local_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_local_events_tenant_date ON local_events(tenant_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_local_events_category ON local_events(category);
CREATE INDEX IF NOT EXISTS idx_local_events_date ON local_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_local_events_impact ON local_events(impact_level);
