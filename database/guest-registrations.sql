-- Tabla para registros oficiales de viajeros (cumplimiento Ley 4/2015)
CREATE TABLE guest_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  
  -- Datos personales (requeridos por España)
  name VARCHAR(255) NOT NULL,
  surname VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  birth_place VARCHAR(255) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('dni', 'passport', 'nie', 'other')),
  document_number VARCHAR(100) NOT NULL,
  document_issuing_country VARCHAR(100) NOT NULL,
  document_expiry_date DATE NOT NULL,
  
  -- Datos de contacto
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(255) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  
  -- Datos del viaje
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  room_number VARCHAR(50) NOT NULL,
  travel_purpose VARCHAR(50) NOT NULL CHECK (travel_purpose IN ('tourism', 'business', 'family', 'other')),
  
  -- Datos adicionales requeridos por España
  previous_accommodation VARCHAR(255),
  next_destination VARCHAR(255),
  vehicle_registration VARCHAR(50),
  
  -- Consentimiento legal
  accepts_terms BOOLEAN NOT NULL DEFAULT false,
  accepts_data_processing BOOLEAN NOT NULL DEFAULT false,
  
  -- Estado del envío oficial
  sent_to_spain_ministry BOOLEAN NOT NULL DEFAULT false,
  spain_ministry_response JSONB,
  spain_ministry_error TEXT,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para búsquedas eficientes
  CONSTRAINT valid_dates CHECK (arrival_date <= departure_date),
  CONSTRAINT valid_document_expiry CHECK (document_expiry_date > CURRENT_DATE)
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_guest_registrations_reservation_id ON guest_registrations(reservation_id);
CREATE INDEX idx_guest_registrations_arrival_date ON guest_registrations(arrival_date);
CREATE INDEX idx_guest_registrations_document_number ON guest_registrations(document_number);
CREATE INDEX idx_guest_registrations_sent_to_spain ON guest_registrations(sent_to_spain_ministry);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_guest_registrations_updated_at 
  BEFORE UPDATE ON guest_registrations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE guest_registrations IS 'Registros oficiales de viajeros conforme a Ley 4/2015 de Protección de Seguridad Ciudadana';
COMMENT ON COLUMN guest_registrations.sent_to_spain_ministry IS 'Indica si los datos han sido enviados al Ministerio del Interior de España';
COMMENT ON COLUMN guest_registrations.spain_ministry_response IS 'Respuesta de la API oficial del Ministerio del Interior';
COMMENT ON COLUMN guest_registrations.accepts_terms IS 'Consentimiento explícito a los términos y condiciones';
COMMENT ON COLUMN guest_registrations.accepts_data_processing IS 'Consentimiento explícito al tratamiento de datos personales';
