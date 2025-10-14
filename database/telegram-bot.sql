-- =========================================
-- TELEGRAM BOT - EXTENSIÓN MULTITENANT
-- =========================================
-- Este archivo agrega las columnas necesarias para el bot de Telegram
-- a la tabla tenants existente

-- Agregar columnas para Telegram a la tabla tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS ai_tokens_used BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_token_limit BIGINT DEFAULT 100000,
ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT false;

-- Crear índice para búsquedas rápidas por telegram_chat_id
CREATE INDEX IF NOT EXISTS idx_tenants_telegram_chat_id ON tenants(telegram_chat_id);

-- Comentarios para documentación
COMMENT ON COLUMN tenants.telegram_chat_id IS 'ID del chat de Telegram del propietario para el bot';
COMMENT ON COLUMN tenants.ai_tokens_used IS 'Tokens de IA consumidos por este tenant';
COMMENT ON COLUMN tenants.ai_token_limit IS 'Límite mensual de tokens de IA para este tenant';
COMMENT ON COLUMN tenants.telegram_enabled IS 'Indica si el tenant tiene acceso al bot de Telegram';

-- Tabla para registrar todas las interacciones con el bot (opcional, para analytics)
CREATE TABLE IF NOT EXISTS telegram_interactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para la tabla de interacciones
CREATE INDEX IF NOT EXISTS idx_telegram_interactions_tenant_id ON telegram_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_telegram_interactions_created_at ON telegram_interactions(created_at DESC);

-- Comentarios
COMMENT ON TABLE telegram_interactions IS 'Registro de todas las conversaciones con el bot de Telegram';
COMMENT ON COLUMN telegram_interactions.tenant_id IS 'ID del tenant que hizo la consulta';
COMMENT ON COLUMN telegram_interactions.chat_id IS 'ID del chat de Telegram';
COMMENT ON COLUMN telegram_interactions.user_message IS 'Mensaje enviado por el usuario';
COMMENT ON COLUMN telegram_interactions.bot_response IS 'Respuesta generada por el bot';
COMMENT ON COLUMN telegram_interactions.tokens_used IS 'Tokens consumidos en esta interacción';

-- Vista para ver uso de IA por tenant
CREATE OR REPLACE VIEW tenant_ai_usage AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.telegram_chat_id,
  t.ai_tokens_used,
  t.ai_token_limit,
  ROUND((t.ai_tokens_used::DECIMAL / NULLIF(t.ai_token_limit, 0)) * 100, 2) as usage_percentage,
  COUNT(ti.id) as total_interactions,
  SUM(ti.tokens_used) as total_tokens_from_interactions,
  MAX(ti.created_at) as last_interaction
FROM tenants t
LEFT JOIN telegram_interactions ti ON t.id = ti.tenant_id
WHERE t.telegram_enabled = true
GROUP BY t.id, t.name, t.telegram_chat_id, t.ai_tokens_used, t.ai_token_limit;

COMMENT ON VIEW tenant_ai_usage IS 'Vista consolidada del uso de IA por tenant';

-- Ejemplo de cómo registrar un nuevo tenant con Telegram
-- Descomenta y personaliza estas líneas para tu caso:

/*
-- Ejemplo 1: Activar Telegram para un tenant existente
UPDATE tenants 
SET 
  telegram_chat_id = 'TU_CHAT_ID_AQUI',  -- Obténlo iniciando conversación con el bot
  telegram_enabled = true,
  ai_token_limit = 100000  -- 100k tokens mensuales
WHERE email = 'tu@email.com';

-- Ejemplo 2: Crear un nuevo tenant con Telegram activado
INSERT INTO tenants (
  name, 
  email, 
  telegram_chat_id, 
  telegram_enabled, 
  ai_token_limit,
  subscription_status
) VALUES (
  'Mi Hotel',
  'hotel@example.com',
  'CHAT_ID_DE_TELEGRAM',
  true,
  100000,
  'active'
);
*/

-- Mostrar resumen
SELECT 
  'Columnas agregadas a tenants' as accion,
  COUNT(*) FILTER (WHERE column_name = 'telegram_chat_id') as telegram_chat_id,
  COUNT(*) FILTER (WHERE column_name = 'ai_tokens_used') as ai_tokens_used,
  COUNT(*) FILTER (WHERE column_name = 'ai_token_limit') as ai_token_limit,
  COUNT(*) FILTER (WHERE column_name = 'telegram_enabled') as telegram_enabled
FROM information_schema.columns 
WHERE table_name = 'tenants' 
  AND column_name IN ('telegram_chat_id', 'ai_tokens_used', 'ai_token_limit', 'telegram_enabled');

