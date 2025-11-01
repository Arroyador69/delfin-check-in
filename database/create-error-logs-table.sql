-- 🔧 Crear tabla de logs de errores para el SuperAdmin
-- 
-- Este script crea la tabla que almacena los errores del sistema
-- para que el superadmin pueda verlos en /superadmin/logs
--
-- Ejecutar este script en Neon (producción o staging)
-- La tabla se crea automáticamente si no existe cuando se usa el código,
-- pero ejecutar este script primero asegura que todo esté listo.

-- Crear tabla de logs de errores
CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  level TEXT NOT NULL CHECK (level IN ('error', 'warning', 'info')),
  message TEXT NOT NULL,
  tenant_id UUID,
  user_id UUID,
  error_stack TEXT,
  error_name TEXT,
  url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant ON error_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);

-- Índice compuesto para búsquedas por tenant y nivel
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant_level ON error_logs(tenant_id, level);

-- Comentarios en la tabla
COMMENT ON TABLE error_logs IS 'Logs de errores del sistema para el SuperAdmin Dashboard';
COMMENT ON COLUMN error_logs.level IS 'Nivel del log: error, warning, o info';
COMMENT ON COLUMN error_logs.tenant_id IS 'ID del tenant que generó el error (NULL si es error del sistema)';
COMMENT ON COLUMN error_logs.user_id IS 'ID del usuario que generó el error (NULL si no aplica)';
COMMENT ON COLUMN error_logs.error_stack IS 'Stack trace completo del error';
COMMENT ON COLUMN error_logs.metadata IS 'Metadata adicional en formato JSON';

