-- =====================================================
-- SISTEMA RADAR REACH - MÓDULO PARA SUPERADMIN
-- =====================================================
-- Este sistema permite detectar tendencias de demanda (Radar)
-- y generar landings dinámicas para convertir en reservas (Reach)
-- =====================================================

-- =====================================================
-- TABLA: radar_signals
-- =====================================================
-- Señales de tendencias detectadas por el Radar
-- Solo almacena datos estructurados, NO contenido generado
CREATE TABLE IF NOT EXISTS radar_signals (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  tenant_id UUID NOT NULL,
  
  -- Información de la señal
  signal_type VARCHAR(50) NOT NULL CHECK (signal_type IN ('google_trends', 'ota_demand', 'seasonal', 'event_based', 'competitor', 'custom')),
  signal_intensity DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (signal_intensity >= 0 AND signal_intensity <= 100),
  signal_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Datos estructurados de la señal (keywords, dates, metrics, etc.)
  
  -- Metadatos
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Cuándo expira esta señal
  is_active BOOLEAN DEFAULT true,
  processed BOOLEAN DEFAULT false, -- Si ya se procesó para generar landing
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_radar_signals_property FOREIGN KEY (property_id) REFERENCES tenant_properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_radar_signals_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLA: dynamic_landings
-- =====================================================
-- Landings dinámicas generadas a partir de señales del Radar
-- Cada landing representa una intención de viaje, NO una habitación específica
CREATE TABLE IF NOT EXISTS dynamic_landings (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  tenant_id UUID NOT NULL,
  radar_signal_id INTEGER, -- Señal que generó esta landing (puede ser NULL si es manual)
  
  -- Identificador único de la landing
  slug VARCHAR(255) NOT NULL UNIQUE, -- URL slug único (ej: "fuengirola-playa-semana-santa-2025")
  public_url TEXT, -- URL completa pública (ej: "https://book.delfincheckin.com/[tenant]/landing/[slug]")
  
  -- Contenido estructurado (JSON, NO HTML plano)
  content JSONB NOT NULL DEFAULT '{
    "title": "",
    "meta_description": "",
    "hero": {
      "headline": "",
      "subheadline": "",
      "cta_text": ""
    },
    "sections": [],
    "faqs": [],
    "seo": {
      "keywords": [],
      "json_ld": {}
    }
  }'::jsonb,
  
  -- Configuración de la landing
  target_date_start DATE, -- Fecha objetivo inicio (ej: para "Semana Santa 2025")
  target_date_end DATE, -- Fecha objetivo fin
  target_keywords TEXT[], -- Keywords objetivo para SEO
  target_audience VARCHAR(100), -- Audiencia objetivo (ej: "familias", "parejas", "grupos")
  
  -- Estado y métricas
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0, -- Reservas generadas desde esta landing
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_dynamic_landings_property FOREIGN KEY (property_id) REFERENCES tenant_properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_dynamic_landings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_dynamic_landings_signal FOREIGN KEY (radar_signal_id) REFERENCES radar_signals(id) ON DELETE SET NULL
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para radar_signals
CREATE INDEX IF NOT EXISTS idx_radar_signals_property_id ON radar_signals(property_id);
CREATE INDEX IF NOT EXISTS idx_radar_signals_tenant_id ON radar_signals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_radar_signals_type ON radar_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_radar_signals_active ON radar_signals(is_active);
CREATE INDEX IF NOT EXISTS idx_radar_signals_processed ON radar_signals(processed);
CREATE INDEX IF NOT EXISTS idx_radar_signals_detected_at ON radar_signals(detected_at);
CREATE INDEX IF NOT EXISTS idx_radar_signals_expires_at ON radar_signals(expires_at);

-- Índices para dynamic_landings
CREATE INDEX IF NOT EXISTS idx_dynamic_landings_property_id ON dynamic_landings(property_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_landings_tenant_id ON dynamic_landings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_landings_signal_id ON dynamic_landings(radar_signal_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_landings_slug ON dynamic_landings(slug);
CREATE INDEX IF NOT EXISTS idx_dynamic_landings_status ON dynamic_landings(status);
CREATE INDEX IF NOT EXISTS idx_dynamic_landings_published ON dynamic_landings(is_published);
CREATE INDEX IF NOT EXISTS idx_dynamic_landings_target_dates ON dynamic_landings(target_date_start, target_date_end);

-- Índice GIN para búsqueda en JSONB
CREATE INDEX IF NOT EXISTS idx_dynamic_landings_content_gin ON dynamic_landings USING GIN (content);
CREATE INDEX IF NOT EXISTS idx_radar_signals_data_gin ON radar_signals USING GIN (signal_data);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_radar_signals_updated_at 
  BEFORE UPDATE ON radar_signals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dynamic_landings_updated_at 
  BEFORE UPDATE ON dynamic_landings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista para señales activas con información de propiedad
CREATE OR REPLACE VIEW active_radar_signals AS
SELECT 
  rs.*,
  tp.property_name,
  tp.tenant_id as property_tenant_id,
  t.name as tenant_name
FROM radar_signals rs
JOIN tenant_properties tp ON rs.property_id = tp.id
JOIN tenants t ON rs.tenant_id = t.id
WHERE rs.is_active = true
  AND (rs.expires_at IS NULL OR rs.expires_at > NOW())
ORDER BY rs.signal_intensity DESC, rs.detected_at DESC;

-- Vista para landings activas con métricas
CREATE OR REPLACE VIEW active_dynamic_landings AS
SELECT 
  dl.*,
  tp.property_name,
  t.name as tenant_name,
  rs.signal_type,
  rs.signal_intensity,
  CASE 
    WHEN dl.views > 0 THEN ROUND((dl.conversions::DECIMAL / dl.views) * 100, 2)
    ELSE 0
  END as conversion_rate
FROM dynamic_landings dl
JOIN tenant_properties tp ON dl.property_id = tp.id
JOIN tenants t ON dl.tenant_id = t.id
LEFT JOIN radar_signals rs ON dl.radar_signal_id = rs.id
WHERE dl.status = 'active' AND dl.is_published = true
ORDER BY dl.created_at DESC;

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE radar_signals IS 'Señales de tendencias detectadas por el Radar. Solo almacena datos estructurados, NO contenido generado.';
COMMENT ON TABLE dynamic_landings IS 'Landings dinámicas generadas a partir de señales del Radar. Cada landing representa una intención de viaje, NO una habitación específica.';

COMMENT ON COLUMN radar_signals.signal_data IS 'Datos estructurados de la señal en JSON (keywords, dates, metrics, source URLs, etc.)';
COMMENT ON COLUMN radar_signals.processed IS 'Indica si esta señal ya se procesó para generar una landing dinámica';
COMMENT ON COLUMN dynamic_landings.content IS 'Contenido estructurado en JSON (title, sections, FAQs, SEO). NO HTML plano.';
COMMENT ON COLUMN dynamic_landings.slug IS 'URL slug único para identificar la landing (ej: "fuengirola-playa-semana-santa-2025")';
COMMENT ON COLUMN dynamic_landings.target_date_start IS 'Fecha objetivo inicio para la intención de viaje (ej: para "Semana Santa 2025")';
COMMENT ON COLUMN dynamic_landings.conversions IS 'Número de reservas generadas desde esta landing';

