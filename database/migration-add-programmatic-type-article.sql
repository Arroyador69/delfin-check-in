-- Añadir type 'article' a programmatic_pages para artículos generados por cron (blog SEO)
-- Ejecutar en Neon SQL Editor

ALTER TABLE programmatic_pages
  DROP CONSTRAINT IF EXISTS programmatic_pages_type_check;

ALTER TABLE programmatic_pages
  ADD CONSTRAINT programmatic_pages_type_check
  CHECK (type IN ('local', 'problem-solution', 'feature', 'comparison', 'pillar', 'article'));

COMMENT ON COLUMN programmatic_pages.type IS 'local, problem-solution, feature, comparison, pillar, o article (generado por cron de artículos)';
