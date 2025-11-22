-- ========================================
-- AUDITORÍA COMPLETA: Verificar tenant_id en todas las tablas
-- ========================================
-- Este script verifica qué tablas tienen tenant_id y cuáles deberían tenerlo

-- 1. LISTAR TODAS LAS TABLAS Y VERIFICAR SI TIENEN COLUMNA tenant_id
SELECT 
  t.table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns c 
      WHERE c.table_schema = 'public' 
        AND c.table_name = t.table_name 
        AND c.column_name = 'tenant_id'
    ) THEN '✅ TIENE tenant_id'
    ELSE '❌ NO tiene tenant_id'
  END as tiene_tenant_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns c 
      WHERE c.table_schema = 'public' 
        AND c.table_name = t.table_name 
        AND c.column_name = 'tenant_id'
    ) THEN (
      SELECT c.data_type || 
        CASE 
          WHEN c.character_maximum_length IS NOT NULL 
          THEN '(' || c.character_maximum_length || ')'
          ELSE ''
        END
      FROM information_schema.columns c 
      WHERE c.table_schema = 'public' 
        AND c.table_name = t.table_name 
        AND c.column_name = 'tenant_id'
      LIMIT 1
    )
    ELSE 'N/A'
  END as tipo_tenant_id,
  CASE 
    WHEN t.table_name IN ('empresa_config', 'tenant_users', 'reservations', 'guests', 'guest_registrations', 'property_room_map')
    THEN '🔒 RLS HABILITADO'
    WHEN t.table_name IN ('tenants', 'Room', 'Lodging')
    THEN 'ℹ️ Tabla maestra (no necesita tenant_id)'
    WHEN t.table_name LIKE 'mir_%' OR t.table_name LIKE 'stripe_%' OR t.table_name LIKE 'payment_%'
    THEN 'ℹ️ Tabla de integración (verificar si necesita tenant_id)'
    WHEN t.table_name LIKE 'tenant_%'
    THEN '⚠️ Tabla de tenant (DEBERÍA tener tenant_id)'
    ELSE '❓ Revisar si necesita tenant_id'
  END as estado_recomendado
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
ORDER BY 
  CASE 
    WHEN t.table_name IN ('empresa_config', 'tenant_users', 'reservations', 'guests', 'guest_registrations', 'property_room_map')
    THEN 1
    WHEN t.table_name LIKE 'tenant_%'
    THEN 2
    ELSE 3
  END,
  t.table_name;

-- 2. VERIFICAR TABLAS CON tenant_id QUE TIENEN VALORES NULL (PROBLEMA DE SEGURIDAD)
SELECT 
  '🚨 TABLAS CON tenant_id NULL (PROBLEMA DE SEGURIDAD)' as alerta,
  'empresa_config' as tabla,
  COUNT(*) as registros_con_tenant_null
FROM empresa_config
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  '🚨 TABLAS CON tenant_id NULL (PROBLEMA DE SEGURIDAD)' as alerta,
  'tenant_users' as tabla,
  COUNT(*) as registros_con_tenant_null
FROM tenant_users
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  '🚨 TABLAS CON tenant_id NULL (PROBLEMA DE SEGURIDAD)' as alerta,
  'reservations' as tabla,
  COUNT(*) as registros_con_tenant_null
FROM reservations
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  '🚨 TABLAS CON tenant_id NULL (PROBLEMA DE SEGURIDAD)' as alerta,
  'guests' as tabla,
  COUNT(*) as registros_con_tenant_null
FROM guests
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  '🚨 TABLAS CON tenant_id NULL (PROBLEMA DE SEGURIDAD)' as alerta,
  'guest_registrations' as tabla,
  COUNT(*) as registros_con_tenant_null
FROM guest_registrations
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  '🚨 TABLAS CON tenant_id NULL (PROBLEMA DE SEGURIDAD)' as alerta,
  'property_room_map' as tabla,
  COUNT(*) as registros_con_tenant_null
FROM property_room_map
WHERE tenant_id IS NULL;

-- 3. VERIFICAR TABLAS QUE DEBERÍAN TENER tenant_id PERO NO LO TIENEN
SELECT 
  '⚠️ TABLAS QUE DEBERÍAN TENER tenant_id' as alerta,
  table_name as tabla,
  'Esta tabla almacena datos por tenant pero NO tiene columna tenant_id' as problema
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND (
    -- Tablas que empiezan con "tenant_" deberían tener tenant_id
    (t.table_name LIKE 'tenant_%' AND t.table_name != 'tenants')
    -- O tablas que claramente son multi-tenant
    OR t.table_name IN (
      'direct_reservations',
      'calendar_events',
      'checkin_instructions',
      'facturas',
      'mir_configuraciones',
      'mir_comunicaciones',
      'property_availability',
      'property_availability_rules',
      'tenant_properties',
      'tenant_bank_accounts',
      'tenant_commission_settings',
      'tenant_integration_settings'
    )
  )
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.table_name 
      AND c.column_name = 'tenant_id'
  )
ORDER BY t.table_name;

-- 4. RESUMEN DE ESTADO DE AISLAMIENTO
SELECT 
  '📊 RESUMEN DE AISLAMIENTO MULTI-TENANT' as seccion,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tablas,
  (SELECT COUNT(*) FROM information_schema.columns c
   JOIN information_schema.tables t ON c.table_name = t.table_name
   WHERE c.table_schema = 'public' 
     AND c.column_name = 'tenant_id'
     AND t.table_type = 'BASE TABLE') as tablas_con_tenant_id,
  (SELECT COUNT(*) FROM empresa_config WHERE tenant_id IS NULL) +
  (SELECT COUNT(*) FROM tenant_users WHERE tenant_id IS NULL) +
  (SELECT COUNT(*) FROM reservations WHERE tenant_id IS NULL) +
  (SELECT COUNT(*) FROM guests WHERE tenant_id IS NULL) +
  (SELECT COUNT(*) FROM guest_registrations WHERE tenant_id IS NULL) +
  (SELECT COUNT(*) FROM property_room_map WHERE tenant_id IS NULL) as registros_sin_tenant_id,
  CASE 
    WHEN (SELECT COUNT(*) FROM empresa_config WHERE tenant_id IS NULL) +
         (SELECT COUNT(*) FROM tenant_users WHERE tenant_id IS NULL) +
         (SELECT COUNT(*) FROM reservations WHERE tenant_id IS NULL) +
         (SELECT COUNT(*) FROM guests WHERE tenant_id IS NULL) +
         (SELECT COUNT(*) FROM guest_registrations WHERE tenant_id IS NULL) +
         (SELECT COUNT(*) FROM property_room_map WHERE tenant_id IS NULL) > 0
    THEN '❌ HAY PROBLEMAS - Registros sin tenant_id encontrados'
    ELSE '✅ TODO OK - Todos los registros tienen tenant_id'
  END as estado_general;

