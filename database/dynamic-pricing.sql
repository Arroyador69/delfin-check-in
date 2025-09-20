-- Esquema de base de datos para sistema de precios dinámicos
-- Incluye eventos locales, competencia y recomendaciones de precios

-- Tabla para alojamientos competidores
CREATE TABLE IF NOT EXISTS competitor_listings (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'google_places', 'discovery'
  engine TEXT, -- 'beds24', 'sirvoy', 'woocommerce_bookings', 'custom', etc.
  room_types JSONB DEFAULT '[]'::jsonb, -- tipos de habitación disponibles
  last_scraped TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para precios diarios de competidores
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

-- Tabla para eventos locales
CREATE TABLE IF NOT EXISTS local_events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP,
  venue TEXT,
  city TEXT DEFAULT 'Fuengirola',
  url TEXT,
  source TEXT NOT NULL, -- 'ics', 'rss', 'eventbrite', 'ticketmaster', 'manual'
  impact_level SMALLINT DEFAULT 0, -- 0..5 (heurística de impacto)
  attendees_estimate INTEGER,
  distance_km NUMERIC(5,2), -- distancia desde nuestro alojamiento
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para ocupación propia (para cálculos)
CREATE TABLE IF NOT EXISTS my_occupancy (
  id BIGSERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  occupancy_pct NUMERIC(5,2) NOT NULL DEFAULT 0, -- 0..100
  total_rooms INTEGER DEFAULT 6, -- nuestras 6 habitaciones
  occupied_rooms INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para recomendaciones de precios generadas
CREATE TABLE IF NOT EXISTS price_recommendations (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL, -- referencia a nuestras habitaciones (room_1, room_2, etc.)
  date DATE NOT NULL,
  current_price NUMERIC(10,2),
  recommended_price NUMERIC(10,2) NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  market_p40 NUMERIC(10,2), -- percentil 40 del mercado
  factors JSONB NOT NULL DEFAULT '{}'::jsonb, -- factores aplicados
  confidence_score NUMERIC(3,2) DEFAULT 0.0, -- 0.0..1.0
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, date)
);

-- Tabla para configuración del sistema de precios
CREATE TABLE IF NOT EXISTS pricing_config (
  id SERIAL PRIMARY KEY,
  room_id TEXT UNIQUE NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  min_price NUMERIC(10,2) NOT NULL,
  max_price NUMERIC(10,2) NOT NULL,
  floor_multiplier NUMERIC(3,2) DEFAULT 0.7, -- multiplicador mínimo
  ceiling_multiplier NUMERIC(3,2) DEFAULT 1.5, -- multiplicador máximo
  weekend_multiplier NUMERIC(3,2) DEFAULT 1.12, -- multiplicador fin de semana
  event_impact_factor NUMERIC(3,2) DEFAULT 0.03, -- +3% por nivel de evento
  low_occupancy_threshold INTEGER DEFAULT 40, -- % ocupación baja
  high_occupancy_threshold INTEGER DEFAULT 80, -- % ocupación alta
  low_occupancy_multiplier NUMERIC(3,2) DEFAULT 0.9,
  high_occupancy_multiplier NUMERIC(3,2) DEFAULT 1.15,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para logs de scraping
CREATE TABLE IF NOT EXISTS scraping_logs (
  id BIGSERIAL PRIMARY KEY,
  listing_id INTEGER REFERENCES competitor_listings(id) ON DELETE SET NULL,
  url TEXT,
  status TEXT NOT NULL, -- 'success', 'failed', 'blocked', 'no_data'
  error_message TEXT,
  data_scraped JSONB,
  duration_ms INTEGER,
  user_agent TEXT,
  robots_txt_respected BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para dominios bloqueados (opt-out)
CREATE TABLE IF NOT EXISTS blocked_domains (
  id SERIAL PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMP DEFAULT NOW(),
  blocked_by TEXT DEFAULT 'system'
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_competitor_daily_prices_date ON competitor_daily_prices(date);
CREATE INDEX IF NOT EXISTS idx_competitor_daily_prices_listing_date ON competitor_daily_prices(listing_id, date);
CREATE INDEX IF NOT EXISTS idx_local_events_date ON local_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_local_events_impact ON local_events(impact_level);
CREATE INDEX IF NOT EXISTS idx_my_occupancy_date ON my_occupancy(date);
CREATE INDEX IF NOT EXISTS idx_price_recommendations_date ON price_recommendations(date);
CREATE INDEX IF NOT EXISTS idx_price_recommendations_room_date ON price_recommendations(room_id, date);

-- Datos iniciales de configuración para nuestras 6 habitaciones
INSERT INTO pricing_config (room_id, base_price, min_price, max_price) VALUES
('room_1', 80.00, 56.00, 120.00),
('room_2', 85.00, 59.50, 127.50),
('room_3', 90.00, 63.00, 135.00),
('room_4', 95.00, 66.50, 142.50),
('room_5', 100.00, 70.00, 150.00),
('room_6', 105.00, 73.50, 157.50)
ON CONFLICT (room_id) DO NOTHING;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_competitor_listings_updated_at BEFORE UPDATE ON competitor_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_local_events_updated_at BEFORE UPDATE ON local_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_my_occupancy_updated_at BEFORE UPDATE ON my_occupancy FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_config_updated_at BEFORE UPDATE ON pricing_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
