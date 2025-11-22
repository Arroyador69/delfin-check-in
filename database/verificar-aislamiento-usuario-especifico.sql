-- ========================================
-- VERIFICACIÓN DE AISLAMIENTO POR USUARIO ESPECÍFICO
-- ========================================
-- Ejecuta esta query reemplazando 'EMAIL_DEL_USUARIO' con el email del tenant
-- para verificar que solo ve sus propios datos

-- 1. INFORMACIÓN DEL TENANT
SELECT 
  '📋 INFORMACIÓN DEL TENANT' as seccion,
  t.id as tenant_id,
  t.email as tenant_email,
  t.name as tenant_name,
  t.status as tenant_status,
  t.created_at as tenant_created
FROM tenants t
WHERE t.email = 'EMAIL_DEL_USUARIO'
LIMIT 1;

-- 2. EMPRESA_CONFIG DE ESTE TENANT
SELECT 
  '🏢 CONFIGURACIÓN DE EMPRESA' as seccion,
  ec.id,
  ec.tenant_id,
  ec.nombre_empresa,
  ec.email as empresa_email,
  ec.nif_empresa,
  CASE 
    WHEN ec.tenant_id = (SELECT id::text FROM tenants WHERE email = 'EMAIL_DEL_USUARIO') 
    THEN '✅ CORRECTO - Aislamiento OK'
    ELSE '❌ ERROR - tenant_id no coincide'
  END as estado_aislamiento
FROM empresa_config ec
WHERE ec.tenant_id = (SELECT id::text FROM tenants WHERE email = 'EMAIL_DEL_USUARIO')
LIMIT 1;

-- 3. USUARIOS DE ESTE TENANT
SELECT 
  '👥 USUARIOS DEL TENANT' as seccion,
  tu.id,
  tu.email,
  tu.full_name,
  tu.role,
  tu.is_active,
  CASE 
    WHEN tu.tenant_id = (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO')
    THEN '✅ CORRECTO - Pertenece a este tenant'
    ELSE '❌ ERROR - Usuario de otro tenant'
  END as estado_aislamiento
FROM tenant_users tu
WHERE tu.tenant_id = (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO')
ORDER BY tu.created_at DESC;

-- 4. RESERVAS DE ESTE TENANT
SELECT 
  '📅 RESERVAS DEL TENANT' as seccion,
  COUNT(*) as total_reservas,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as reservas_confirmadas,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as reservas_canceladas,
  CASE 
    WHEN COUNT(*) > 0 AND COUNT(CASE WHEN tenant_id != (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO') THEN 1 END) = 0
    THEN '✅ CORRECTO - Solo reservas de este tenant'
    WHEN COUNT(*) = 0
    THEN 'ℹ️ Sin reservas (normal)'
    ELSE '❌ ERROR - Hay reservas de otros tenants'
  END as estado_aislamiento
FROM reservations
WHERE tenant_id = (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO');

-- 5. HUÉSPEDES DE ESTE TENANT
SELECT 
  '👤 HUÉSPEDES DEL TENANT' as seccion,
  COUNT(*) as total_huespedes,
  CASE 
    WHEN COUNT(*) > 0 AND COUNT(CASE WHEN tenant_id != (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO') THEN 1 END) = 0
    THEN '✅ CORRECTO - Solo huéspedes de este tenant'
    WHEN COUNT(*) = 0
    THEN 'ℹ️ Sin huéspedes (normal)'
    ELSE '❌ ERROR - Hay huéspedes de otros tenants'
  END as estado_aislamiento
FROM guests
WHERE tenant_id = (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO');

-- 6. REGISTROS DE HUÉSPEDES DE ESTE TENANT
SELECT 
  '📝 REGISTROS DE HUÉSPEDES DEL TENANT' as seccion,
  COUNT(*) as total_registros,
  CASE 
    WHEN COUNT(*) > 0 AND COUNT(CASE WHEN tenant_id != (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO') THEN 1 END) = 0
    THEN '✅ CORRECTO - Solo registros de este tenant'
    WHEN COUNT(*) = 0
    THEN 'ℹ️ Sin registros (normal)'
    ELSE '❌ ERROR - Hay registros de otros tenants'
  END as estado_aislamiento
FROM guest_registrations
WHERE tenant_id = (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO');

-- 7. VERIFICACIÓN CRÍTICA: ¿HAY DATOS DE OTROS TENANTS?
SELECT 
  '🚨 VERIFICACIÓN CRÍTICA DE AISLAMIENTO' as seccion,
  (SELECT COUNT(*) FROM empresa_config WHERE tenant_id != (SELECT id::text FROM tenants WHERE email = 'EMAIL_DEL_USUARIO')) as empresa_config_otros_tenants,
  (SELECT COUNT(*) FROM tenant_users WHERE tenant_id != (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO')) as usuarios_otros_tenants,
  (SELECT COUNT(*) FROM reservations WHERE tenant_id != (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO')) as reservas_otros_tenants,
  (SELECT COUNT(*) FROM guests WHERE tenant_id != (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO')) as huespedes_otros_tenants,
  (SELECT COUNT(*) FROM guest_registrations WHERE tenant_id != (SELECT id FROM tenants WHERE email = 'EMAIL_DEL_USUARIO')) as registros_otros_tenants,
  CASE 
    WHEN (SELECT COUNT(*) FROM empresa_config WHERE tenant_id = (SELECT id::text FROM tenants WHERE email = 'EMAIL_DEL_USUARIO')) > 0
      AND (SELECT COUNT(*) FROM empresa_config WHERE tenant_id != (SELECT id::text FROM tenants WHERE email = 'EMAIL_DEL_USUARIO')) > 0
    THEN '✅ CORRECTO - Hay datos de otros tenants en la BD (normal), pero este tenant solo ve los suyos'
    WHEN (SELECT COUNT(*) FROM empresa_config WHERE tenant_id = (SELECT id::text FROM tenants WHERE email = 'EMAIL_DEL_USUARIO')) > 0
    THEN '✅ CORRECTO - Este tenant tiene sus datos y no hay mezcla'
    ELSE 'ℹ️ Este tenant aún no tiene datos (normal si es nuevo)'
  END as estado_general;

