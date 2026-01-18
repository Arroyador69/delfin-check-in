-- ========================================
-- MIGRACIÓN: Sistema de Blog/Artículos
-- ========================================
-- Fecha: 2026-01-18
-- Propósito: Crear infraestructura para blog educativo con tracking

-- ========================================
-- TABLA: blog_articles
-- ========================================
CREATE TABLE IF NOT EXISTS blog_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL, -- URL amigable: "multas-por-no-registrar-viajeros"
  title VARCHAR(500) NOT NULL, -- Título del artículo
  meta_description TEXT, -- Meta descripción para SEO (160 caracteres recomendado)
  meta_keywords TEXT, -- Palabras clave separadas por comas
  
  -- Contenido
  content TEXT NOT NULL, -- Contenido HTML del artículo
  excerpt TEXT, -- Resumen corto para listados
  
  -- SEO y Schema.org
  canonical_url VARCHAR(500), -- URL canónica
  schema_json JSONB, -- Structured data para IAs y Google
  
  -- Estado y visibilidad
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Autor y metadatos
  author_name VARCHAR(255) DEFAULT 'Delfín Check-in',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices adicionales
  view_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0
);

-- Índices para blog_articles
CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug);
CREATE INDEX IF NOT EXISTS idx_blog_articles_status ON blog_articles(status);
CREATE INDEX IF NOT EXISTS idx_blog_articles_published_at ON blog_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_articles_is_published ON blog_articles(is_published);

COMMENT ON TABLE blog_articles IS 'Artículos del blog educativo de Delfín Check-in';
COMMENT ON COLUMN blog_articles.slug IS 'URL amigable única para el artículo';
COMMENT ON COLUMN blog_articles.schema_json IS 'Structured data (JSON-LD) para optimización IA y SEO';

-- ========================================
-- TABLA: blog_analytics_sessions
-- ========================================
-- Similar a landing_sessions pero para cada artículo
CREATE TABLE IF NOT EXISTS blog_analytics_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES blog_articles(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL, -- ID de sesión de PostHog o UUID generado
  
  -- Información de la sesión
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  time_on_page INTEGER, -- Segundos en la página
  
  -- Comportamiento
  scroll_depth INTEGER, -- Porcentaje máximo de scroll (0-100)
  conversion BOOLEAN DEFAULT FALSE, -- Si se completó el formulario de waitlist
  popup_viewed BOOLEAN DEFAULT FALSE,
  popup_closed BOOLEAN DEFAULT FALSE,
  popup_clicked BOOLEAN DEFAULT FALSE,
  
  -- Origen del tráfico
  referrer TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  
  -- Información técnica
  user_agent TEXT,
  device_type VARCHAR(50), -- 'mobile', 'desktop', 'tablet'
  ip_address VARCHAR(45),
  country_code VARCHAR(2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para blog_analytics_sessions
CREATE INDEX IF NOT EXISTS idx_blog_sessions_article_id ON blog_analytics_sessions(article_id);
CREATE INDEX IF NOT EXISTS idx_blog_sessions_session_id ON blog_analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_blog_sessions_started_at ON blog_analytics_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_blog_sessions_conversion ON blog_analytics_sessions(conversion);

COMMENT ON TABLE blog_analytics_sessions IS 'Sesiones de usuario en artículos del blog';

-- ========================================
-- TABLA: blog_analytics_events
-- ========================================
-- Eventos específicos dentro de cada sesión
CREATE TABLE IF NOT EXISTS blog_analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES blog_articles(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  
  event_type VARCHAR(100) NOT NULL, -- 'page_view', 'scroll', 'click', 'popup_view', etc.
  event_data JSONB, -- Datos adicionales del evento
  
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para blog_analytics_events
CREATE INDEX IF NOT EXISTS idx_blog_events_article_id ON blog_analytics_events(article_id);
CREATE INDEX IF NOT EXISTS idx_blog_events_session_id ON blog_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_blog_events_type ON blog_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_blog_events_timestamp ON blog_analytics_events(timestamp);

COMMENT ON TABLE blog_analytics_events IS 'Eventos de interacción en artículos del blog';

-- ========================================
-- ACTUALIZAR TABLA: waitlist
-- ========================================
-- Ya tiene el campo 'source', solo nos aseguramos de que existe
-- y creamos un índice para consultas rápidas por origen

DO $$ 
BEGIN
  -- Verificar si la columna existe, si no, agregarla
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'waitlist' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE waitlist ADD COLUMN source VARCHAR(100);
  END IF;
END $$;

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_waitlist_source ON waitlist(source);

COMMENT ON COLUMN waitlist.source IS 'Origen del lead: "landing", "article:slug-del-articulo", "referral", etc.';

-- ========================================
-- DATOS INICIALES (Opcional)
-- ========================================
-- Podemos insertar un artículo de prueba o dejarlo para el CMS

-- Vista útil para estadísticas rápidas por artículo
CREATE OR REPLACE VIEW blog_article_stats AS
SELECT 
  ba.id,
  ba.slug,
  ba.title,
  ba.status,
  ba.is_published,
  ba.published_at,
  ba.view_count,
  ba.conversion_count,
  COUNT(DISTINCT bas.session_id) as total_sessions,
  COUNT(DISTINCT CASE WHEN bas.conversion = true THEN bas.session_id END) as conversions,
  ROUND(AVG(bas.time_on_page), 2) as avg_time_on_page,
  ROUND(AVG(bas.scroll_depth), 2) as avg_scroll_depth,
  COUNT(DISTINCT CASE WHEN bas.popup_viewed = true THEN bas.session_id END) as popup_views,
  COUNT(DISTINCT CASE WHEN bas.conversion = true THEN bas.session_id END)::float / 
    NULLIF(COUNT(DISTINCT bas.session_id), 0) * 100 as conversion_rate
FROM blog_articles ba
LEFT JOIN blog_analytics_sessions bas ON ba.id = bas.article_id
GROUP BY ba.id, ba.slug, ba.title, ba.status, ba.is_published, ba.published_at, ba.view_count, ba.conversion_count;

COMMENT ON VIEW blog_article_stats IS 'Vista consolidada de estadísticas por artículo';

-- ========================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ========================================
CREATE OR REPLACE FUNCTION update_blog_article_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_blog_article_timestamp ON blog_articles;
CREATE TRIGGER trigger_update_blog_article_timestamp
BEFORE UPDATE ON blog_articles
FOR EACH ROW
EXECUTE FUNCTION update_blog_article_updated_at();

-- ========================================
-- FIN DE LA MIGRACIÓN
-- ========================================
