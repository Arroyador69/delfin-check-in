-- ========================================
-- TABLA: telegram_chats (Múltiples chat_ids por tenant)
-- ========================================
-- Esta tabla permite que múltiples usuarios de Telegram
-- accedan al mismo tenant (compartir reservas)

CREATE TABLE IF NOT EXISTS telegram_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relación con tenant
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Información del chat de Telegram
  chat_id VARCHAR(255) NOT NULL UNIQUE,
  user_name VARCHAR(255),
  user_first_name VARCHAR(255),
  
  -- Estado
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: Un chat_id único en toda la tabla
  UNIQUE(chat_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_telegram_chats_tenant_id ON telegram_chats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chats_chat_id ON telegram_chats(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chats_active ON telegram_chats(is_active);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_telegram_chats_updated_at BEFORE UPDATE ON telegram_chats
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE telegram_chats IS 'Chats de Telegram asociados a cada tenant (múltiples por tenant)';
COMMENT ON COLUMN telegram_chats.chat_id IS 'ID único del chat de Telegram';
COMMENT ON COLUMN telegram_chats.user_name IS 'Nombre de usuario de Telegram';
COMMENT ON COLUMN telegram_chats.user_first_name IS 'Nombre real del usuario';
COMMENT ON COLUMN telegram_chats.is_active IS 'Si el chat está activo y puede recibir mensajes';

