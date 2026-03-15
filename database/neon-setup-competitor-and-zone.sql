-- Ejecutar en Neon SQL Editor si competitor_listings no existe.
-- Crea las tablas del sistema de precios dinámicos y añade la columna zone.

-- 1. Tabla competidores (con zone incluida)
CREATE TABLE IF NOT EXISTS competitor_listings (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'manual',
  engine TEXT,
  room_types JSONB DEFAULT '[]'::jsonb,
  last_scraped TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  zone TEXT
);

-- 2. Si la tabla ya existía sin zone, añadirla
ALTER TABLE competitor_listings ADD COLUMN IF NOT EXISTS zone TEXT;

-- 3. Precios diarios por competidor
CREATE TABLE IF NOT EXISTS competitor_daily_prices (
  id BIGSERIAL PRIMARY KEY,
  listing_id INTEGER REFERENCES competitor_listings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'standard',
  price NUMERIC(10,2),
  availability BOOLEAN DEFAULT true,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(listing_id, date, room_type)
);

-- 4. Eventos locales
CREATE TABLE IF NOT EXISTS local_events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP,
  venue TEXT,
  city TEXT DEFAULT 'Fuengirola',
  url TEXT,
  source TEXT NOT NULL,
  impact_level SMALLINT DEFAULT 0,
  attendees_estimate INTEGER,
  distance_km NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Ocupación propia (opcional)
CREATE TABLE IF NOT EXISTS my_occupancy (
  id BIGSERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  occupancy_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_rooms INTEGER DEFAULT 6,
  occupied_rooms INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Recomendaciones de precio (opcional)
CREATE TABLE IF NOT EXISTS price_recommendations (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL,
  date DATE NOT NULL,
  current_price NUMERIC(10,2),
  recommended_price NUMERIC(10,2) NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  market_p40 NUMERIC(10,2),
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(3,2) DEFAULT 0.0,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, date)
);

-- 7. Configuración de precios (opcional)
CREATE TABLE IF NOT EXISTS pricing_config (
  id SERIAL PRIMARY KEY,
  room_id TEXT UNIQUE NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  min_price NUMERIC(10,2) NOT NULL,
  max_price NUMERIC(10,2) NOT NULL,
  floor_multiplier NUMERIC(3,2) DEFAULT 0.7,
  ceiling_multiplier NUMERIC(3,2) DEFAULT 1.5,
  weekend_multiplier NUMERIC(3,2) DEFAULT 1.12,
  event_impact_factor NUMERIC(3,2) DEFAULT 0.03,
  low_occupancy_threshold INTEGER DEFAULT 40,
  high_occupancy_threshold INTEGER DEFAULT 80,
  low_occupancy_multiplier NUMERIC(3,2) DEFAULT 0.9,
  high_occupancy_multiplier NUMERIC(3,2) DEFAULT 1.15,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Índices
CREATE INDEX IF NOT EXISTS idx_competitor_daily_prices_date ON competitor_daily_prices(date);
CREATE INDEX IF NOT EXISTS idx_competitor_daily_prices_listing_date ON competitor_daily_prices(listing_id, date);
CREATE INDEX IF NOT EXISTS idx_local_events_date ON local_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_my_occupancy_date ON my_occupancy(date);
CREATE INDEX IF NOT EXISTS idx_competitor_listings_zone ON competitor_listings(zone) WHERE zone IS NOT NULL;
