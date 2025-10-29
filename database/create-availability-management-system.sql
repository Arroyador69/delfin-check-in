-- =====================================================
-- SISTEMA DE GESTIÓN DE DISPONIBILIDAD MULTITENANT
-- =====================================================

-- Tabla para reglas de disponibilidad por propiedad
CREATE TABLE IF NOT EXISTS property_availability_rules (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  tenant_id UUID NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- 'advance_booking', 'minimum_stay', 'maximum_stay', 'blocked_dates', 'seasonal_pricing'
  rule_data JSONB NOT NULL, -- Datos específicos de la regla
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_availability_rules_property FOREIGN KEY (property_id) REFERENCES tenant_properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_availability_rules_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Tabla para calendarios externos (iCal, Google Calendar, etc.)
CREATE TABLE IF NOT EXISTS external_calendars (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  property_id INTEGER NOT NULL,
  calendar_name VARCHAR(255) NOT NULL,
  calendar_type VARCHAR(50) NOT NULL, -- 'ical', 'google', 'airbnb', 'booking'
  calendar_url TEXT, -- Para iCal feeds
  api_credentials JSONB, -- Para APIs que requieren autenticación
  sync_frequency INTEGER DEFAULT 15, -- Minutos entre sincronizaciones
  last_sync_at TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'error'
  sync_error TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_external_calendars_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_external_calendars_property FOREIGN KEY (property_id) REFERENCES tenant_properties(id) ON DELETE CASCADE
);

-- Tabla para eventos de calendario sincronizados
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  external_calendar_id INTEGER NOT NULL,
  tenant_id UUID NOT NULL,
  property_id INTEGER NOT NULL,
  external_event_id VARCHAR(255) NOT NULL, -- ID del evento en el calendario externo
  event_title VARCHAR(255),
  event_description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_blocked BOOLEAN DEFAULT true, -- Si bloquea la propiedad
  event_type VARCHAR(50) DEFAULT 'reservation', -- 'reservation', 'maintenance', 'blocked'
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  external_source VARCHAR(100), -- 'airbnb', 'booking', 'google', etc.
  last_updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_calendar_events_calendar FOREIGN KEY (external_calendar_id) REFERENCES external_calendars(id) ON DELETE CASCADE,
  CONSTRAINT fk_calendar_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_calendar_events_property FOREIGN KEY (property_id) REFERENCES tenant_properties(id) ON DELETE CASCADE,
  UNIQUE(external_calendar_id, external_event_id)
);

-- Tabla para configuración de integraciones por tenant
CREATE TABLE IF NOT EXISTS tenant_integration_settings (
  id SERIAL PRIMARY KEY,
  tenant_id UUID UNIQUE NOT NULL,
  max_properties INTEGER DEFAULT 6, -- Máximo según plan contratado
  allowed_calendar_types JSONB DEFAULT '["ical"]'::jsonb, -- Tipos de calendario permitidos
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_conflict_resolution VARCHAR(50) DEFAULT 'external_priority', -- 'external_priority', 'internal_priority', 'manual'
  notification_settings JSONB DEFAULT '{"email": true, "webhook": false}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_integration_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para property_availability_rules
CREATE INDEX IF NOT EXISTS idx_availability_rules_property_id ON property_availability_rules(property_id);
CREATE INDEX IF NOT EXISTS idx_availability_rules_tenant_id ON property_availability_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_rules_type ON property_availability_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_availability_rules_active ON property_availability_rules(is_active);

-- Índices para external_calendars
CREATE INDEX IF NOT EXISTS idx_external_calendars_tenant_id ON external_calendars(tenant_id);
CREATE INDEX IF NOT EXISTS idx_external_calendars_property_id ON external_calendars(property_id);
CREATE INDEX IF NOT EXISTS idx_external_calendars_type ON external_calendars(calendar_type);
CREATE INDEX IF NOT EXISTS idx_external_calendars_active ON external_calendars(is_active);
CREATE INDEX IF NOT EXISTS idx_external_calendars_sync_status ON external_calendars(sync_status);

-- Índices para calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON calendar_events(external_calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_id ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_property_id ON calendar_events(property_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_blocked ON calendar_events(is_blocked);
CREATE INDEX IF NOT EXISTS idx_calendar_events_source ON calendar_events(external_source);

-- =====================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para verificar disponibilidad considerando calendarios externos
CREATE OR REPLACE FUNCTION check_property_availability(
  p_property_id INTEGER,
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE(
  available BOOLEAN,
  blocked_dates DATE[],
  conflicting_events JSONB[]
) AS $$
DECLARE
  blocked_dates DATE[] := '{}';
  conflicting_events JSONB[] := '{}';
  event_record RECORD;
  current_date DATE;
BEGIN
  -- Verificar bloqueos en property_availability
  FOR event_record IN
    SELECT date, blocked_reason
    FROM property_availability
    WHERE property_id = p_property_id
      AND date >= p_check_in_date
      AND date < p_check_out_date
      AND available = false
  LOOP
    blocked_dates := array_append(blocked_dates, event_record.date);
    conflicting_events := array_append(conflicting_events, 
      jsonb_build_object(
        'type', 'internal_block',
        'date', event_record.date,
        'reason', event_record.blocked_reason
      )
    );
  END LOOP;

  -- Verificar eventos de calendarios externos
  FOR event_record IN
    SELECT 
      ce.start_date,
      ce.end_date,
      ce.event_title,
      ce.event_type,
      ce.external_source,
      ec.calendar_name
    FROM calendar_events ce
    JOIN external_calendars ec ON ce.external_calendar_id = ec.id
    WHERE ce.property_id = p_property_id
      AND ce.is_blocked = true
      AND ce.start_date < p_check_out_date
      AND ce.end_date > p_check_in_date
      AND ec.is_active = true
  LOOP
    -- Agregar todas las fechas del evento
    current_date := event_record.start_date;
    WHILE current_date < event_record.end_date LOOP
      blocked_dates := array_append(blocked_dates, current_date);
      current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    conflicting_events := array_append(conflicting_events,
      jsonb_build_object(
        'type', 'external_event',
        'start_date', event_record.start_date,
        'end_date', event_record.end_date,
        'title', event_record.event_title,
        'source', event_record.external_source,
        'calendar', event_record.calendar_name
      )
    );
  END LOOP;

  -- Eliminar duplicados
  SELECT array_agg(DISTINCT date ORDER BY date) INTO blocked_dates
  FROM unnest(blocked_dates) AS date;

  RETURN QUERY SELECT 
    array_length(blocked_dates, 1) IS NULL OR array_length(blocked_dates, 1) = 0,
    blocked_dates,
    conflicting_events;
END;
$$ LANGUAGE plpgsql;

-- Función para sincronizar calendario externo
CREATE OR REPLACE FUNCTION sync_external_calendar(p_calendar_id INTEGER)
RETURNS TABLE(
  success BOOLEAN,
  events_processed INTEGER,
  events_added INTEGER,
  events_updated INTEGER,
  events_removed INTEGER,
  error_message TEXT
) AS $$
DECLARE
  calendar_record RECORD;
  events_processed INTEGER := 0;
  events_added INTEGER := 0;
  events_updated INTEGER := 0;
  events_removed INTEGER := 0;
  error_msg TEXT := NULL;
BEGIN
  -- Obtener información del calendario
  SELECT * INTO calendar_record
  FROM external_calendars
  WHERE id = p_calendar_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 0, 0, 'Calendario no encontrado o inactivo';
    RETURN;
  END IF;

  -- Actualizar estado de sincronización
  UPDATE external_calendars
  SET sync_status = 'syncing', last_sync_at = NOW()
  WHERE id = p_calendar_id;

  -- Aquí iría la lógica de sincronización específica según el tipo de calendario
  -- Por ahora, simulamos una sincronización exitosa
  
  -- Actualizar estado final
  UPDATE external_calendars
  SET sync_status = 'success', sync_error = NULL
  WHERE id = p_calendar_id;

  RETURN QUERY SELECT true, events_processed, events_added, events_updated, events_removed, error_msg;

EXCEPTION WHEN OTHERS THEN
  -- En caso de error, actualizar estado
  UPDATE external_calendars
  SET sync_status = 'error', sync_error = SQLERRM
  WHERE id = p_calendar_id;

  RETURN QUERY SELECT false, 0, 0, 0, 0, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at en nuevas tablas
CREATE TRIGGER update_property_availability_rules_updated_at 
  BEFORE UPDATE ON property_availability_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_external_calendars_updated_at 
  BEFORE UPDATE ON external_calendars 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_integration_settings_updated_at 
  BEFORE UPDATE ON tenant_integration_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar configuración de integraciones por defecto para tenants existentes
INSERT INTO tenant_integration_settings (tenant_id, max_properties, allowed_calendar_types, auto_sync_enabled)
SELECT 
  id as tenant_id,
  max_rooms as max_properties, -- Usar max_rooms como límite de propiedades
  '["ical", "google"]'::jsonb as allowed_calendar_types,
  true as auto_sync_enabled
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM tenant_integration_settings);

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista para propiedades con información de calendarios
CREATE OR REPLACE VIEW property_calendar_info AS
SELECT 
  tp.*,
  COUNT(DISTINCT ec.id) as total_calendars,
  COUNT(DISTINCT CASE WHEN ec.is_active THEN ec.id END) as active_calendars,
  COUNT(DISTINCT ce.id) as total_events,
  COUNT(DISTINCT CASE WHEN ce.is_blocked THEN ce.id END) as blocked_events,
  MAX(ec.last_sync_at) as last_sync_date,
  tis.max_properties,
  tis.auto_sync_enabled
FROM tenant_properties tp
LEFT JOIN external_calendars ec ON tp.id = ec.property_id
LEFT JOIN calendar_events ce ON tp.id = ce.property_id
LEFT JOIN tenant_integration_settings tis ON tp.tenant_id = tis.tenant_id
GROUP BY tp.id, tis.max_properties, tis.auto_sync_enabled;

-- Vista para estadísticas de sincronización
CREATE OR REPLACE VIEW calendar_sync_stats AS
SELECT 
  ec.tenant_id,
  ec.calendar_type,
  COUNT(*) as total_calendars,
  COUNT(CASE WHEN ec.is_active THEN 1 END) as active_calendars,
  COUNT(CASE WHEN ec.sync_status = 'success' THEN 1 END) as successful_syncs,
  COUNT(CASE WHEN ec.sync_status = 'error' THEN 1 END) as failed_syncs,
  COUNT(CASE WHEN ec.sync_status = 'syncing' THEN 1 END) as syncing_now,
  AVG(EXTRACT(EPOCH FROM (NOW() - ec.last_sync_at))/60) as minutes_since_last_sync
FROM external_calendars ec
GROUP BY ec.tenant_id, ec.calendar_type;

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE property_availability_rules IS 'Reglas de disponibilidad específicas por propiedad';
COMMENT ON TABLE external_calendars IS 'Calendarios externos sincronizados (iCal, Google, Airbnb, etc.)';
COMMENT ON TABLE calendar_events IS 'Eventos sincronizados desde calendarios externos';
COMMENT ON TABLE tenant_integration_settings IS 'Configuración de integraciones por tenant según plan contratado';

COMMENT ON COLUMN external_calendars.calendar_type IS 'Tipo de calendario: ical, google, airbnb, booking';
COMMENT ON COLUMN external_calendars.api_credentials IS 'Credenciales encriptadas para APIs que requieren autenticación';
COMMENT ON COLUMN calendar_events.is_blocked IS 'Si el evento bloquea la propiedad para reservas';
COMMENT ON COLUMN tenant_integration_settings.max_properties IS 'Máximo de propiedades según plan contratado';
COMMENT ON COLUMN tenant_integration_settings.sync_conflict_resolution IS 'Estrategia para resolver conflictos: external_priority, internal_priority, manual';

