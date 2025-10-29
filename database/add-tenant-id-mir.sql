-- ========================================
-- MIGRACIÓN: Añadir tenant_id a mir_comunicaciones
-- ========================================
-- Este script añade la columna tenant_id a la tabla mir_comunicaciones
-- para soportar el sistema multitenant

-- Añadir tenant_id a tabla mir_comunicaciones
ALTER TABLE mir_comunicaciones 
ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255);

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_tenant_id ON mir_comunicaciones(tenant_id);

-- Añadir comentario para documentación
COMMENT ON COLUMN mir_comunicaciones.tenant_id IS 'ID del tenant (cliente) al que pertenece esta comunicación MIR';

-- Actualizar registros existentes con tenant_id por defecto
UPDATE mir_comunicaciones 
SET tenant_id = 'default' 
WHERE tenant_id IS NULL;

-- Verificar que la columna se añadió correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'mir_comunicaciones' 
AND column_name = 'tenant_id';

-- Mostrar estadísticas de la migración
SELECT 
    'mir_comunicaciones' as tabla,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as con_tenant_id,
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sin_tenant_id
FROM mir_comunicaciones;

