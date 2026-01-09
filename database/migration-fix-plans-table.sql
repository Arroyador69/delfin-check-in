-- ========================================
-- FIX: Corregir tabla plans para nuevo sistema
-- ========================================
-- Este SQL corrige la tabla plans existente para que funcione con el nuevo sistema

-- Paso 1: Verificar y renombrar columna 'name' si existe a 'name_es'
DO $$ 
BEGIN
  -- Si existe columna 'name' pero no 'name_es', renombrarla
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plans' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plans' AND column_name = 'name_es'
  ) THEN
    ALTER TABLE plans RENAME COLUMN name TO name_es;
  END IF;
END $$;

-- Paso 2: Añadir todas las columnas faltantes
ALTER TABLE plans ADD COLUMN IF NOT EXISTS name_es VARCHAR(255);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS base_price_eur DECIMAL(10,2);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS extra_room_price_eur DECIMAL(10,2);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_rooms_included INTEGER;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_rooms_total INTEGER;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS ads_enabled BOOLEAN DEFAULT true;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS legal_module BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS direct_reservations BOOLEAN DEFAULT true;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 9.00;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Paso 3: Actualizar valores NULL en filas existentes
UPDATE plans 
SET 
  name_es = COALESCE(name_es, 'Plan ' || id),
  name_en = COALESCE(name_en, 'Plan ' || id),
  base_price_eur = COALESCE(base_price_eur, 0.00)
WHERE name_es IS NULL OR name_en IS NULL OR base_price_eur IS NULL;

-- Paso 4: Ahora hacer el INSERT/UPDATE de los planes (esto debería funcionar ahora)
INSERT INTO plans (id, name_es, name_en, base_price_eur, extra_room_price_eur, max_rooms_included, max_rooms_total, ads_enabled, legal_module) VALUES
  ('free', 'Plan Gratis', 'Free Plan', 0.00, NULL, 2, 2, true, false),
  ('checkin', 'Plan Check-in', 'Check-in Plan', 8.00, 4.00, 2, NULL, true, true),
  ('pro', 'Plan Pro', 'Pro Plan', 29.99, NULL, 6, NULL, false, true)
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  name_en = EXCLUDED.name_en,
  base_price_eur = EXCLUDED.base_price_eur,
  extra_room_price_eur = EXCLUDED.extra_room_price_eur,
  max_rooms_included = EXCLUDED.max_rooms_included,
  max_rooms_total = EXCLUDED.max_rooms_total,
  ads_enabled = EXCLUDED.ads_enabled,
  legal_module = EXCLUDED.legal_module,
  updated_at = NOW();

