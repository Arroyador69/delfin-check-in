-- Habitaciones
CREATE TABLE "Room" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ical_in_airbnb_url TEXT,
  ical_in_booking_url TEXT,
  ical_out_url TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reservas
CREATE TABLE reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id VARCHAR(255) NOT NULL UNIQUE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),
  guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count > 0),
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE NOT NULL,
  channel VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (channel IN ('airbnb', 'booking', 'manual')),
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Huéspedes (check-in digital)
CREATE TABLE guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('dni', 'passport', 'nie', 'other')),
  document_number VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  country VARCHAR(100) NOT NULL,
  signature_url TEXT,
  accepts_rules BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mensajes automáticos
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger VARCHAR(100) NOT NULL,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'telegram', 'whatsapp')),
  template TEXT NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tareas de limpieza
CREATE TABLE cleaning_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reglas de precios dinámicos
CREATE TABLE pricing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('advance', 'occupancy', 'weekend', 'event')),
  parameter TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhooks y jobs
CREATE TABLE webhooks_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exportaciones
CREATE TABLE exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('reservations', 'guests', 'cleaning', 'financial')),
  period VARCHAR(50) NOT NULL,
  file_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuración del sistema
CREATE TABLE system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_reservations_room_id ON reservations(room_id);
CREATE INDEX idx_reservations_check_in ON reservations(check_in);
CREATE INDEX idx_reservations_check_out ON reservations(check_out);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_external_id ON reservations(external_id);

CREATE INDEX idx_guests_reservation_id ON guests(reservation_id);

CREATE INDEX idx_cleaning_tasks_room_id ON cleaning_tasks(room_id);
CREATE INDEX idx_cleaning_tasks_date ON cleaning_tasks(date);
CREATE INDEX idx_cleaning_tasks_status ON cleaning_tasks(status);

CREATE INDEX idx_pricing_rules_room_id ON pricing_rules(room_id);
CREATE INDEX idx_pricing_rules_type ON pricing_rules(rule_type);

CREATE INDEX idx_webhooks_jobs_status ON webhooks_jobs(status);
CREATE INDEX idx_webhooks_jobs_type ON webhooks_jobs(type);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_jobs_updated_at BEFORE UPDATE ON webhooks_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Datos iniciales
INSERT INTO system_config (key, value, description) VALUES
('app_name', 'Delfín Check-in 🐬', 'Nombre de la aplicación'),
('app_version', '1.0.0', 'Versión de la aplicación'),
('ical_sync_interval', '10', 'Intervalo de sincronización iCal en minutos'),
('telegram_notifications_enabled', 'true', 'Habilitar notificaciones de Telegram'),
('email_notifications_enabled', 'false', 'Habilitar notificaciones por email');

-- Plantillas de mensajes iniciales
INSERT INTO messages (trigger, channel, template, language, is_active) VALUES
-- Confirmación de reserva
('reservation_confirmed', 'email', 'Hola {{guest_name}},\n\n¡Gracias por reservar con nosotros!\n\nDetalles de tu reserva:\n- Habitación: {{room_name}}\n- Check-in: {{check_in_date}}\n- Check-out: {{check_out_date}}\n\nEn breve recibirás el enlace para completar tu check-in digital.\n\n¡Nos vemos pronto!\n\nSaludos,\nEl equipo de {{app_name}}', 'es', true),

-- Recordatorio 7 días antes
('t_minus_7_days', 'email', 'Hola {{guest_name}},\n\nTu llegada está a solo 7 días.\n\nRecordatorio de tu reserva:\n- Habitación: {{room_name}}\n- Check-in: {{check_in_date}}\n- Check-out: {{check_out_date}}\n\n¿Cómo llegar?\n{{directions}}\n\n¡Nos vemos pronto!\n\nSaludos,\nEl equipo de {{app_name}}', 'es', true),

-- Check-in 24h antes
('t_minus_24_hours', 'email', 'Hola {{guest_name}},\n\n¡Mañana es tu llegada!\n\nCódigo de la puerta: {{door_code}}\n\nNormas importantes:\n{{house_rules}}\n\nWiFi: {{wifi_network}}\nContraseña: {{wifi_password}}\n\n¡Bienvenido!\n\nSaludos,\nEl equipo de {{app_name}}', 'es', true),

-- Post check-out
('post_checkout', 'email', 'Hola {{guest_name}},\n\n¡Gracias por tu estancia!\n\nEsperamos que hayas disfrutado de tu tiempo con nosotros.\n\nSi te ha gustado tu experiencia, nos harías muy felices con una reseña:\n{{review_link}}\n\n¡Hasta la próxima!\n\nSaludos,\nEl equipo de {{app_name}}', 'es', true);

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
  
  -- Validaciones
  CONSTRAINT valid_dates CHECK (arrival_date <= departure_date),
  CONSTRAINT valid_document_expiry CHECK (document_expiry_date > CURRENT_DATE)
);

-- Índices para la tabla guest_registrations
CREATE INDEX idx_guest_registrations_reservation_id ON guest_registrations(reservation_id);
CREATE INDEX idx_guest_registrations_arrival_date ON guest_registrations(arrival_date);
CREATE INDEX idx_guest_registrations_document_number ON guest_registrations(document_number);
CREATE INDEX idx_guest_registrations_sent_to_spain ON guest_registrations(sent_to_spain_ministry);

-- Trigger para actualizar updated_at en guest_registrations
CREATE TRIGGER update_guest_registrations_updated_at 
  BEFORE UPDATE ON guest_registrations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habitaciones de ejemplo (para tus 6 habitaciones)
INSERT INTO "Room" (name, "basePrice") VALUES
('Habitación 1', 80.00),
('Habitación 2', 85.00),
('Habitación 3', 90.00),
('Habitación 4', 95.00),
('Habitación 5', 100.00),
('Habitación 6', 105.00);
