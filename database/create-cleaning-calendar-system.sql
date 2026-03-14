-- ============================================================
-- SISTEMA DE CALENDARIO DE LIMPIEZA
-- Ejecutar en Neon PostgreSQL (paso a paso si es necesario)
-- ============================================================

-- 0. Extensión necesaria para gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tipo ENUM para cuándo se dispara la limpieza
DO $$ BEGIN
  CREATE TYPE cleaning_trigger_type AS ENUM (
    'on_checkout',
    'day_before_checkin',
    'both'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tipo ENUM para autor de notas
DO $$ BEGIN
  CREATE TYPE cleaning_note_author AS ENUM ('owner', 'cleaner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Tabla principal: configuración de limpieza por habitación
CREATE TABLE IF NOT EXISTS cleaning_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id VARCHAR(50) NOT NULL,
  checkout_time TIME NOT NULL DEFAULT '11:00',
  checkin_time TIME NOT NULL DEFAULT '16:00',
  cleaning_duration_minutes INTEGER NOT NULL DEFAULT 120
    CHECK (cleaning_duration_minutes > 0 AND cleaning_duration_minutes <= 480),
  cleaning_trigger cleaning_trigger_type NOT NULL DEFAULT 'on_checkout',
  same_day_alert BOOLEAN NOT NULL DEFAULT true,
  ical_token VARCHAR(64) NOT NULL DEFAULT md5(gen_random_uuid()::text || now()::text || random()::text),
  ical_enabled BOOLEAN NOT NULL DEFAULT true,
  cleaner_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_cleaning_config_tenant_room UNIQUE (tenant_id, room_id),
  CONSTRAINT uq_cleaning_config_token UNIQUE (ical_token)
);

-- 4. Índices para cleaning_config
CREATE INDEX IF NOT EXISTS idx_cleaning_config_tenant
  ON cleaning_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_config_token
  ON cleaning_config(ical_token);

-- 5. Tabla de notas bidireccionales
CREATE TABLE IF NOT EXISTS cleaning_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id VARCHAR(50) NOT NULL,
  reservation_id UUID,
  cleaning_date DATE NOT NULL,
  author_type cleaning_note_author NOT NULL,
  note TEXT NOT NULL CHECK (char_length(note) <= 2000),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Índices para cleaning_notes
CREATE INDEX IF NOT EXISTS idx_cleaning_notes_tenant_room
  ON cleaning_notes(tenant_id, room_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_notes_date
  ON cleaning_notes(cleaning_date DESC);
CREATE INDEX IF NOT EXISTS idx_cleaning_notes_unread
  ON cleaning_notes(tenant_id, read_at) WHERE read_at IS NULL;

-- 7. RLS (Row Level Security)
ALTER TABLE cleaning_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS cleaning_config_tenant_isolation ON cleaning_config;
  CREATE POLICY cleaning_config_tenant_isolation ON cleaning_config
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS policy cleaning_config skipped: %', SQLERRM;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS cleaning_notes_tenant_isolation ON cleaning_notes;
  CREATE POLICY cleaning_notes_tenant_isolation ON cleaning_notes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS policy cleaning_notes skipped: %', SQLERRM;
END $$;

-- 8. Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_cleaning_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleaning_config_updated ON cleaning_config;
CREATE TRIGGER trg_cleaning_config_updated
  BEFORE UPDATE ON cleaning_config
  FOR EACH ROW
  EXECUTE FUNCTION update_cleaning_config_timestamp();

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 'cleaning_config' AS tabla, count(*) AS filas FROM cleaning_config
UNION ALL
SELECT 'cleaning_notes', count(*) FROM cleaning_notes;
