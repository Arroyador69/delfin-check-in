-- Script para verificar las conexiones entre tablas del sistema de onboarding
-- Ejecutar en el SQL Editor de Neon/Vercel

-- 1. Verificar estructura de la tabla dpa_aceptaciones
SELECT 
    'dpa_aceptaciones' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'dpa_aceptaciones' 
ORDER BY ordinal_position;

-- 2. Verificar estructura de la tabla empresa_config
SELECT 
    'empresa_config' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'empresa_config' 
ORDER BY ordinal_position;

-- 3. Verificar estructura de la tabla mir_configuraciones
SELECT 
    'mir_configuraciones' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'mir_configuraciones' 
ORDER BY ordinal_position;

-- 4. Verificar estructura de la tabla tenants
SELECT 
    'tenants' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tenants' 
ORDER BY ordinal_position;

-- 5. Verificar relaciones entre tablas
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('dpa_aceptaciones', 'empresa_config', 'mir_configuraciones', 'tenants');

-- 6. Verificar índices existentes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('dpa_aceptaciones', 'empresa_config', 'mir_configuraciones', 'tenants')
ORDER BY tablename, indexname;

-- 7. Verificar datos de ejemplo (si existen)
SELECT 'dpa_aceptaciones' as tabla, COUNT(*) as registros FROM dpa_aceptaciones
UNION ALL
SELECT 'empresa_config' as tabla, COUNT(*) as registros FROM empresa_config
UNION ALL
SELECT 'mir_configuraciones' as tabla, COUNT(*) as registros FROM mir_configuraciones
UNION ALL
SELECT 'tenants' as tabla, COUNT(*) as registros FROM tenants;

-- 8. Verificar integridad referencial (ejemplo con tenant específico)
-- Reemplazar '870e589f-d313-4a5a-901f-f25fd4e7240a' con el tenant_id real
WITH tenant_data AS (
    SELECT '870e589f-d313-4a5a-901f-f25fd4e7240a'::text as tenant_id
)
SELECT 
    'Verificación de integridad' as tipo,
    CASE 
        WHEN EXISTS(SELECT 1 FROM dpa_aceptaciones WHERE tenant_id = td.tenant_id) THEN '✅ DPA'
        ELSE '❌ DPA'
    END as dpa_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM empresa_config WHERE tenant_id = td.tenant_id) THEN '✅ Empresa'
        ELSE '❌ Empresa'
    END as empresa_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM mir_configuraciones WHERE propietario_id = td.tenant_id) THEN '✅ MIR'
        ELSE '❌ MIR'
    END as mir_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM tenants WHERE id = td.tenant_id) THEN '✅ Tenant'
        ELSE '❌ Tenant'
    END as tenant_status
FROM tenant_data td;

-- 9. Crear índices para optimizar consultas (si no existen)
CREATE INDEX IF NOT EXISTS idx_dpa_aceptaciones_tenant_id ON dpa_aceptaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dpa_aceptaciones_onboarding ON dpa_aceptaciones(onboarding_completo);
CREATE INDEX IF NOT EXISTS idx_empresa_config_tenant_id ON empresa_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mir_configuraciones_propietario ON mir_configuraciones(propietario_id);
CREATE INDEX IF NOT EXISTS idx_mir_configuraciones_activo ON mir_configuraciones(activo);

-- 10. Verificar que los índices se crearon correctamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
    AND tablename IN ('dpa_aceptaciones', 'empresa_config', 'mir_configuraciones')
ORDER BY tablename, indexname;
