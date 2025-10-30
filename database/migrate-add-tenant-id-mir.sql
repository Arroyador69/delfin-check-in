-- ========================================
-- MIGRACIÓN: Añadir tenant_id a mir_comunicaciones
-- ========================================
-- Este script añade la columna tenant_id a la tabla mir_comunicaciones
-- para soportar el sistema multitenant según las normas MIR oficiales
-- 
-- BASADO EN: MIR-HOSPE-DSI-WS-Servicio de Hospedajes - Comunicaciones v3.1.3
-- Fecha: 2025-01-28
-- Propósito: Cumplir con las normas MIR para sistema multitenant

-- ========================================
-- VERIFICACIÓN PREVIA
-- ========================================

-- Verificar que la tabla mir_comunicaciones existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mir_comunicaciones') THEN
        RAISE EXCEPTION 'La tabla mir_comunicaciones no existe. Ejecute primero el script setup-mir-tablas.sql';
    END IF;
END $$;

-- Verificar que guest_registrations tiene tenant_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_registrations' AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION 'La tabla guest_registrations no tiene la columna tenant_id. Ejecute primero el script multi-tenant.sql';
    END IF;
END $$;

-- ========================================
-- MIGRACIÓN PRINCIPAL
-- ========================================

-- Añadir tenant_id a tabla mir_comunicaciones
ALTER TABLE mir_comunicaciones 
ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255);

-- Crear índice para mejorar rendimiento de consultas por tenant
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_tenant_id ON mir_comunicaciones(tenant_id);

-- Crear índice compuesto para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_tenant_tipo_estado 
ON mir_comunicaciones(tenant_id, tipo, estado);

-- Añadir comentario para documentación
COMMENT ON COLUMN mir_comunicaciones.tenant_id IS 'ID del tenant (cliente) al que pertenece esta comunicación MIR. Requerido para cumplir con las normas MIR multitenant.';

-- ========================================
-- ACTUALIZACIÓN DE DATOS EXISTENTES
-- ========================================

-- Actualizar registros existentes con tenant_id basado en guest_registrations
UPDATE mir_comunicaciones 
SET tenant_id = gr.tenant_id
FROM guest_registrations gr
WHERE mir_comunicaciones.referencia LIKE gr.reserva_ref || '%'
AND mir_comunicaciones.tenant_id IS NULL
AND gr.tenant_id IS NOT NULL;

-- Para registros que no se pueden vincular, usar 'default'
UPDATE mir_comunicaciones 
SET tenant_id = 'default' 
WHERE tenant_id IS NULL;

-- ========================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ========================================

-- Verificar que la columna se añadió correctamente
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mir_comunicaciones' AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE EXCEPTION 'Error: La columna tenant_id no se añadió correctamente a mir_comunicaciones';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id añadida correctamente a mir_comunicaciones';
    END IF;
END $$;

-- Mostrar estadísticas de la migración
SELECT 
    'mir_comunicaciones' as tabla,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as con_tenant_id,
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sin_tenant_id,
    COUNT(DISTINCT tenant_id) as tenants_unicos
FROM mir_comunicaciones;

-- Mostrar distribución por tenant
SELECT 
    tenant_id,
    COUNT(*) as comunicaciones,
    COUNT(CASE WHEN tipo = 'PV' THEN 1 END) as pv_count,
    COUNT(CASE WHEN tipo = 'RH' THEN 1 END) as rh_count,
    COUNT(CASE WHEN estado = 'enviado' THEN 1 END) as enviados,
    COUNT(CASE WHEN estado = 'error' THEN 1 END) as errores
FROM mir_comunicaciones 
GROUP BY tenant_id
ORDER BY comunicaciones DESC;

-- ========================================
-- VERIFICACIÓN DE INTEGRIDAD
-- ========================================

-- Verificar que todos los registros tienen tenant_id
DO $$
DECLARE
    registros_sin_tenant INTEGER;
BEGIN
    SELECT COUNT(*) INTO registros_sin_tenant
    FROM mir_comunicaciones 
    WHERE tenant_id IS NULL;
    
    IF registros_sin_tenant > 0 THEN
        RAISE WARNING 'Hay % registros sin tenant_id en mir_comunicaciones', registros_sin_tenant;
    ELSE
        RAISE NOTICE '✅ Todos los registros tienen tenant_id asignado';
    END IF;
END $$;

-- ========================================
-- DOCUMENTACIÓN DE LA MIGRACIÓN
-- ========================================

-- Mostrar información de la tabla actualizada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'mir_comunicaciones' 
ORDER BY ordinal_position;

-- Mostrar índices creados
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'mir_comunicaciones'
ORDER BY indexname;

-- ========================================
-- MENSAJE FINAL
-- ========================================

SELECT '🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE' as resultado,
       'La tabla mir_comunicaciones ahora soporta el sistema multitenant según las normas MIR' as descripcion,
       NOW() as fecha_migracion;




