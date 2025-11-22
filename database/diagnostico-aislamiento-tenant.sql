-- ========================================
-- DIAGNÓSTICO COMPLETO DE AISLAMIENTO MULTI-TENANT
-- ========================================
-- Este script verifica que el aislamiento entre tenants funcione correctamente

-- 1. Verificar estructura de tenant_id en ambas tablas
SELECT 
  'tenants' as tabla,
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tenants' 
  AND column_name = 'id'
UNION ALL
SELECT 
  'empresa_config' as tabla,
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'empresa_config' 
  AND column_name = 'tenant_id';

-- 2. Verificar todos los tenants y sus empresa_config
SELECT 
  t.id as tenant_id_uuid,
  t.id::text as tenant_id_string,
  t.email as tenant_email,
  t.name as tenant_name,
  ec.id as empresa_config_id,
  ec.tenant_id as empresa_config_tenant_id,
  ec.nombre_empresa,
  ec.email as empresa_email,
  CASE 
    WHEN ec.tenant_id = t.id::text THEN '✅ Coincide'
    WHEN ec.id IS NULL THEN '⚠️ Sin empresa_config'
    ELSE '❌ NO COINCIDE - PROBLEMA DE SEGURIDAD'
  END as estado_aislamiento
FROM tenants t
LEFT JOIN empresa_config ec ON ec.tenant_id = t.id::text
ORDER BY t.created_at DESC;

-- 3. Verificar si hay empresa_config sin tenant válido (datos huérfanos)
SELECT 
  ec.id,
  ec.tenant_id,
  ec.nombre_empresa,
  ec.email,
  CASE 
    WHEN t.id IS NULL THEN '❌ HUÉRFANO - Sin tenant válido'
    ELSE '✅ Tiene tenant'
  END as estado
FROM empresa_config ec
LEFT JOIN tenants t ON ec.tenant_id = t.id::text
WHERE t.id IS NULL;

-- 4. Verificar tenant_users y su relación con tenants
SELECT 
  tu.id as user_id,
  tu.tenant_id as user_tenant_id,
  tu.email as user_email,
  t.id as tenant_id,
  t.email as tenant_email,
  CASE 
    WHEN tu.tenant_id = t.id THEN '✅ Coincide'
    WHEN t.id IS NULL THEN '❌ Tenant no existe'
    ELSE '❌ NO COINCIDE'
  END as estado
FROM tenant_users tu
LEFT JOIN tenants t ON tu.tenant_id = t.id
ORDER BY tu.created_at DESC
LIMIT 10;

-- 5. Resumen de seguridad
SELECT 
  (SELECT COUNT(*) FROM tenants) as total_tenants,
  (SELECT COUNT(*) FROM empresa_config) as total_empresa_config,
  (SELECT COUNT(*) FROM empresa_config ec 
   JOIN tenants t ON ec.tenant_id = t.id::text) as empresa_config_con_tenant_valido,
  (SELECT COUNT(*) FROM empresa_config ec 
   LEFT JOIN tenants t ON ec.tenant_id = t.id::text 
   WHERE t.id IS NULL) as empresa_config_huérfanos,
  (SELECT COUNT(*) FROM tenant_users) as total_users,
  (SELECT COUNT(*) FROM tenant_users tu 
   JOIN tenants t ON tu.tenant_id = t.id) as users_con_tenant_valido;

