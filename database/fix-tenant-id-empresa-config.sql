-- ========================================
-- SCRIPT DE VERIFICACIÓN Y CORRECCIÓN
-- ========================================
-- Este script verifica y corrige inconsistencias en tenant_id
-- entre la tabla tenants (UUID) y empresa_config (VARCHAR)

-- 1. Verificar qué valores tiene empresa_config.tenant_id
SELECT 
  ec.id,
  ec.tenant_id as empresa_config_tenant_id,
  t.id as tenants_id,
  t.email as tenant_email,
  ec.nombre_empresa,
  ec.email as empresa_email,
  CASE 
    WHEN ec.tenant_id = t.id::text THEN '✅ Coincide'
    WHEN t.id IS NULL THEN '❌ Tenant no existe'
    ELSE '⚠️ No coincide'
  END as estado
FROM empresa_config ec
LEFT JOIN tenants t ON ec.tenant_id = t.id::text
ORDER BY ec.id;

-- 2. Si hay inconsistencias, este script las muestra
-- Para corregir manualmente, ejecutar:
-- UPDATE empresa_config SET tenant_id = (SELECT id::text FROM tenants WHERE email = 'email-del-tenant') WHERE id = X;

-- 3. Verificar que todos los tenant_id en empresa_config correspondan a tenants válidos
SELECT 
  COUNT(*) as total_empresa_config,
  COUNT(t.id) as con_tenant_valido,
  COUNT(*) - COUNT(t.id) as sin_tenant_valido
FROM empresa_config ec
LEFT JOIN tenants t ON ec.tenant_id = t.id::text;

