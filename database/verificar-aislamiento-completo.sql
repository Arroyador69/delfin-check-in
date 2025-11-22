-- ========================================
-- VERIFICACIÓN COMPLETA DE AISLAMIENTO MULTI-TENANT
-- ========================================
-- Ejecuta esta query para verificar que cada tenant solo ve sus propios datos

-- 1. VER TODOS LOS TENANTS Y SUS EMPRESA_CONFIG
SELECT 
  t.id as tenant_id_uuid,
  t.id::text as tenant_id_string,
  t.email as tenant_email,
  t.name as tenant_name,
  t.status as tenant_status,
  t.created_at as tenant_created,
  ec.id as empresa_config_id,
  ec.tenant_id as empresa_config_tenant_id,
  ec.nombre_empresa,
  ec.email as empresa_email,
  CASE 
    WHEN ec.tenant_id = t.id::text THEN '✅ Coincide - AISLAMIENTO OK'
    WHEN ec.id IS NULL THEN '⚠️ Sin empresa_config (normal si es nuevo)'
    ELSE '❌ NO COINCIDE - PROBLEMA DE SEGURIDAD'
  END as estado_aislamiento
FROM tenants t
LEFT JOIN empresa_config ec ON ec.tenant_id = t.id::text
ORDER BY t.created_at DESC;

-- 2. VERIFICAR SI HAY EMPRESA_CONFIG HUÉRFANOS (sin tenant válido)
SELECT 
  '❌ PROBLEMA DE SEGURIDAD' as alerta,
  ec.id,
  ec.tenant_id,
  ec.nombre_empresa,
  ec.email,
  'Este registro NO tiene un tenant válido asociado' as problema
FROM empresa_config ec
LEFT JOIN tenants t ON ec.tenant_id = t.id::text
WHERE t.id IS NULL;

-- 3. RESUMEN DE SEGURIDAD
SELECT 
  (SELECT COUNT(*) FROM tenants) as total_tenants,
  (SELECT COUNT(*) FROM empresa_config) as total_empresa_config,
  (SELECT COUNT(*) FROM empresa_config ec 
   JOIN tenants t ON ec.tenant_id = t.id::text) as empresa_config_con_tenant_valido,
  (SELECT COUNT(*) FROM empresa_config ec 
   LEFT JOIN tenants t ON ec.tenant_id = t.id::text 
   WHERE t.id IS NULL) as empresa_config_huérfanos,
  CASE 
    WHEN (SELECT COUNT(*) FROM empresa_config ec 
          LEFT JOIN tenants t ON ec.tenant_id = t.id::text 
          WHERE t.id IS NULL) > 0 
    THEN '❌ HAY PROBLEMAS - Datos huérfanos encontrados'
    ELSE '✅ TODO OK - Todos los empresa_config tienen tenant válido'
  END as estado_general;

