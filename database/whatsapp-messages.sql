-- Esquema para mensajes automáticos de WhatsApp
-- Tabla para plantillas de mensajes
CREATE TABLE IF NOT EXISTS message_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  trigger_type VARCHAR(50) NOT NULL, -- reservation_confirmed, checkin_instructions, etc.
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  language VARCHAR(5) NOT NULL DEFAULT 'es',
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- Variables disponibles en la plantilla
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para registro de mensajes enviados
CREATE TABLE IF NOT EXISTS sent_messages (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES message_templates(id),
  reservation_id INTEGER, -- Referencia a la reserva
  guest_phone VARCHAR(20) NOT NULL,
  guest_name VARCHAR(100),
  message_content TEXT NOT NULL,
  whatsapp_message_id VARCHAR(100), -- ID del mensaje en WhatsApp
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, read, failed
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para configuración de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL DEFAULT '+34617555255',
  access_token TEXT, -- Token de WhatsApp Business API
  webhook_verify_token VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración por defecto
INSERT INTO whatsapp_config (phone_number, is_active) 
VALUES ('+34617555255', true)
ON CONFLICT (id) DO NOTHING;

-- Insertar plantillas por defecto
INSERT INTO message_templates (name, trigger_type, template_content, variables) VALUES
(
  'Confirmación de Reserva',
  'reservation_confirmed',
  '¡Hola {{guest_name}}! 🏨

Tu reserva ha sido confirmada:

📅 Fechas: {{check_in}} - {{check_out}}
🏠 Habitación: {{room_number}} ({{room_code}})
👥 Huéspedes: {{guest_count}}

Para cualquier consulta, no dudes en contactarnos.

¡Esperamos verte pronto! 🐬',
  '["guest_name", "check_in", "check_out", "room_number", "room_code", "guest_count"]'::jsonb
),
(
  'Instrucciones Check-in',
  'checkin_instructions',
  '¡Hola {{guest_name}}! 🗝️

Instrucciones para tu check-in:

🏠 Habitación: {{room_number}}
🔑 Código: {{room_code}}
📅 Fecha: {{check_in}}

El código te permitirá acceder a la habitación las 24h.

¡Que disfrutes tu estancia! 🐬',
  '["guest_name", "room_number", "room_code", "check_in"]'::jsonb
),
(
  'Recordatorio 7 días',
  't_minus_7_days',
  '¡Hola {{guest_name}}! ⏰

Te recordamos que en 7 días tienes tu reserva:

📅 {{check_in}} - {{check_out}}
🏠 Habitación {{room_number}}

¿Necesitas el formulario de registro de huéspedes? Te lo podemos enviar.

¡Nos vemos pronto! 🐬',
  '["guest_name", "check_in", "check_out", "room_number"]'::jsonb
),
(
  'Recordatorio 24h',
  't_minus_24_hours',
  '¡Hola {{guest_name}}! 🚀

¡Mañana es tu llegada! 

📅 Check-in: {{check_in}}
🏠 Habitación: {{room_number}} ({{room_code}})

¿Necesitas el formulario de registro? Responde "SÍ" y te lo enviamos.

¡Te esperamos! 🐬',
  '["guest_name", "check_in", "room_number", "room_code"]'::jsonb
),
(
  'Envío Formulario',
  'send_form',
  '¡Perfecto! 📋

Aquí tienes el formulario de registro de huéspedes:

🔗 {{form_url}}

Por favor, complétalo antes de tu llegada.

¡Gracias! 🐬',
  '["form_url"]'::jsonb
),
(
  'Post Check-out',
  'post_checkout',
  '¡Hola {{guest_name}}! 👋

Esperamos que hayas disfrutado tu estancia en la habitación {{room_number}}.

¿Cómo fue todo? Nos encantaría conocer tu experiencia.

¡Gracias por elegirnos! 🐬',
  '["guest_name", "room_number"]'::jsonb
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_sent_messages_reservation ON sent_messages(reservation_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_phone ON sent_messages(guest_phone);
CREATE INDEX IF NOT EXISTS idx_sent_messages_status ON sent_messages(status);
CREATE INDEX IF NOT EXISTS idx_sent_messages_created ON sent_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_templates_trigger ON message_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_templates_active ON message_templates(is_active);
