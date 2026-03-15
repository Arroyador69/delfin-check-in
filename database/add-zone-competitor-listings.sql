-- Añadir columna zone a competitor_listings para filtrar precios por zona (ciudad/provincia/área) en España
-- Permite ver media y percentiles de precios de competencia por zona y fechas

ALTER TABLE competitor_listings
  ADD COLUMN IF NOT EXISTS zone TEXT;

COMMENT ON COLUMN competitor_listings.zone IS 'Zona/área (ej. Fuengirola, Málaga, Valencia) para agrupar precios de competencia';

CREATE INDEX IF NOT EXISTS idx_competitor_listings_zone
  ON competitor_listings(zone) WHERE zone IS NOT NULL;

-- Opcional: rellenar zone para listings que tenían source fuengirola_local
-- UPDATE competitor_listings SET zone = 'Fuengirola' WHERE source = 'fuengirola_local' AND zone IS NULL;
