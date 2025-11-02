-- Tabla de plantillas de contenido programático
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('local', 'problem-solution', 'feature', 'comparison', 'pillar')),
  prompt_base TEXT NOT NULL,
  variables_schema JSONB NOT NULL,
  target_length INTEGER DEFAULT 800, -- palabras objetivo
  cta_url TEXT DEFAULT 'https://delfincheckin.com',
  pricing_eur DECIMAL(10,2) DEFAULT 29.99,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de publicaciones programáticas
CREATE TABLE IF NOT EXISTS programmatic_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('local', 'problem-solution', 'feature', 'comparison', 'pillar')),
  slug TEXT NOT NULL UNIQUE,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  content_html TEXT NOT NULL,
  content_jsonld JSONB, -- Schema JSON-LD estructurado
  variables_used JSONB, -- Variables que se usaron para generar esta página
  seo_score INTEGER DEFAULT 0, -- 0-100
  local_signals_count INTEGER DEFAULT 0, -- Señales locales encontradas
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'indexed', 'failed')),
  publish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  indexed_at TIMESTAMPTZ,
  github_commit_sha TEXT, -- SHA del commit en GitHub
  github_file_path TEXT, -- Path del archivo en GitHub
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de métricas de páginas programáticas
CREATE TABLE IF NOT EXISTS programmatic_page_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES programmatic_pages(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  -- Métricas de indexación
  is_indexed BOOLEAN DEFAULT false,
  indexation_date TIMESTAMPTZ,
  -- Métricas de Search Console
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0, -- Click-through rate
  avg_position DECIMAL(6,2) DEFAULT 0,
  -- Métricas de Analytics
  sessions INTEGER DEFAULT 0,
  avg_session_duration DECIMAL(10,2) DEFAULT 0, -- segundos
  bounce_rate DECIMAL(5,4) DEFAULT 0,
  scroll_depth_75 DECIMAL(5,4) DEFAULT 0, -- % usuarios que llegaron al 75%
  -- Métricas de conversión
  checkout_sessions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  -- Core Web Vitals
  lcp DECIMAL(6,2) DEFAULT 0, -- Largest Contentful Paint (ms)
  inp DECIMAL(6,2) DEFAULT 0, -- Interaction to Next Paint (ms)
  cls DECIMAL(5,4) DEFAULT 0, -- Cumulative Layout Shift
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page_id, metric_date)
);

-- Tabla de dataset (ciudades, problemas, features, etc.)
CREATE TABLE IF NOT EXISTS content_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('city', 'problem', 'feature', 'comparison', 'pillar')),
  key TEXT NOT NULL, -- Identificador único (ej: 'malaga', 'offline-envios')
  label TEXT NOT NULL, -- Nombre legible (ej: 'Málaga', 'Enviar partes sin internet')
  data JSONB NOT NULL, -- Datos específicos del tipo
  used_count INTEGER DEFAULT 0, -- Cuántas veces se ha usado
  last_used_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(type, key)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_programmatic_pages_status ON programmatic_pages(status);
CREATE INDEX IF NOT EXISTS idx_programmatic_pages_publish_at ON programmatic_pages(publish_at);
CREATE INDEX IF NOT EXISTS idx_programmatic_pages_type ON programmatic_pages(type);
CREATE INDEX IF NOT EXISTS idx_programmatic_pages_slug ON programmatic_pages(slug);
CREATE INDEX IF NOT EXISTS idx_page_metrics_page_date ON programmatic_page_metrics(page_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_page_metrics_date ON programmatic_page_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_content_datasets_type_active ON content_datasets(type, active);
CREATE INDEX IF NOT EXISTS idx_content_templates_type_active ON content_templates(type, active);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_templates_updated_at BEFORE UPDATE ON content_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programmatic_pages_updated_at BEFORE UPDATE ON programmatic_pages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programmatic_page_metrics_updated_at BEFORE UPDATE ON programmatic_page_metrics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_datasets_updated_at BEFORE UPDATE ON content_datasets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

