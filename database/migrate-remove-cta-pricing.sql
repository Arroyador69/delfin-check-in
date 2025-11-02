-- Migración: Eliminar cta_url y pricing_eur de content_templates
-- Añadir is_test para páginas de prueba/preview
-- Fecha: 2025-01-XX

-- Paso 1: Añadir columna is_test si no existe
ALTER TABLE content_templates 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Paso 2: Añadir columna is_test a programmatic_pages para poder crear páginas de prueba
ALTER TABLE programmatic_pages
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Paso 3: Eliminar columnas cta_url y pricing_eur (comentadas para seguridad, descomentar cuando esté listo)
-- NOTA: Asegúrate de que el código no use estos campos antes de ejecutar esto
-- ALTER TABLE content_templates DROP COLUMN IF EXISTS cta_url;
-- ALTER TABLE content_templates DROP COLUMN IF EXISTS pricing_eur;

-- Paso 4: Crear índice para búsquedas de páginas de prueba
CREATE INDEX IF NOT EXISTS idx_programmatic_pages_is_test ON programmatic_pages(is_test);

-- Paso 5: Crear tabla de leads capturados desde páginas programáticas
CREATE TABLE IF NOT EXISTS programmatic_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT DEFAULT 'programmatic_page', -- fuente del lead
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  views_count INTEGER DEFAULT 1, -- cuántas veces se ha visto este email
  converted BOOLEAN DEFAULT false, -- si se convirtió en cliente
  converted_at TIMESTAMPTZ,
  notes TEXT, -- notas sobre el lead
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_programmatic_leads_email ON programmatic_leads(email);
CREATE INDEX IF NOT EXISTS idx_programmatic_leads_source ON programmatic_leads(source);
CREATE INDEX IF NOT EXISTS idx_programmatic_leads_created ON programmatic_leads(created_at);

-- Trigger para actualizar updated_at
-- Primero eliminamos el trigger si existe, luego lo creamos
DROP TRIGGER IF EXISTS update_programmatic_leads_updated_at ON programmatic_leads;
CREATE TRIGGER update_programmatic_leads_updated_at BEFORE UPDATE ON programmatic_leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

