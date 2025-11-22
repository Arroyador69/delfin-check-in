-- ========================================
-- ANÁLISIS COMPLETO: ¿Qué tablas necesitan tenant_id?
-- ========================================
-- Este script analiza TODAS las tablas y determina si necesitan tenant_id

-- 1. ANÁLISIS POR CATEGORÍA
SELECT 
  t.table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns c 
      WHERE c.table_schema = 'public' 
        AND c.table_name = t.table_name 
        AND c.column_name = 'tenant_id'
    ) THEN '✅ TIENE tenant_id'
    ELSE '❌ NO tiene tenant_id'
  END as tiene_tenant_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns c 
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
    -- Tablas que DEFINITIVAMENTE necesitan tenant_id (datos por tenant)
    WHEN t.table_name IN (
      'empresa_config', 'tenant_users', 'reservations', 'guests', 
      'guest_registrations', 'property_room_map',
      'calendar_events', 'checkin_instructions', 'commission_transactions',
      'content_datasets', 'content_templates', 'direct_reservations',
      'dpa_aceptaciones', 'external_calendars', 'facturas',
      'mir_comunicaciones', 'mir_configuraciones',
      'payment_attempts', 'payment_links', 'payment_notifications',
      'programmatic_leads', 'programmatic_page_metrics', 'programmatic_pages',
      'property_availability', 'property_availability_rules',
      'tenant_bank_accounts', 'tenant_commission_settings',
      'tenant_integration_settings', 'tenant_properties',
      'stripe_invoices'
    ) THEN 
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM information_schema.columns c 
          WHERE c.table_schema = 'public' 
            AND c.table_name = t.table_name 
            AND c.column_name = 'tenant_id'
        ) THEN '✅ CORRECTO - Tiene tenant_id'
        ELSE '🚨 CRÍTICO - DEBE tener tenant_id'
      END
    
    -- Tablas que empiezan con "tenant_" DEBEN tener tenant_id
    WHEN t.table_name LIKE 'tenant_%' THEN 
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM information_schema.columns c 
          WHERE c.table_schema = 'public' 
            AND c.table_name = t.table_name 
            AND c.column_name = 'tenant_id'
        ) THEN '✅ CORRECTO - Tiene tenant_id'
        ELSE '🚨 CRÍTICO - DEBE tener tenant_id'
      END
    
    -- Tablas maestras que NO necesitan tenant_id
    WHEN t.table_name IN ('tenants') THEN 'ℹ️ Tabla maestra (no necesita tenant_id)'
    
    -- Tablas de sistema/auditoría que pueden ser globales
    WHEN t.table_name IN ('audit_log', 'error_logs') THEN '❓ Revisar - Puede ser global o por tenant'
    
    -- Tablas de Room/Lodging - Revisar si son maestras o por tenant
    WHEN t.table_name IN ('Room', 'Lodging') THEN '❓ Revisar - Puede ser tabla maestra o por tenant'
    
    -- Vistas (no necesitan tenant_id)
    WHEN t.table_name IN ('property_stats', 'tenant_reservation_stats', 'tenants_with_verified_bank') THEN 'ℹ️ Vista (no necesita tenant_id)'
    
    ELSE '❓ Revisar caso de uso'
  END as estado_recomendado,
  CASE 
    WHEN t.table_name IN (
      'empresa_config', 'tenant_users', 'reservations', 'guests', 
      'guest_registrations', 'property_room_map'
    ) THEN '🔒 RLS HABILITADO'
    ELSE '⚠️ Verificar RLS'
  END as rls_status
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
ORDER BY 
  CASE 
    WHEN t.table_name IN (
      'empresa_config', 'tenant_users', 'reservations', 'guests', 
      'guest_registrations', 'property_room_map'
    ) THEN 1
    WHEN t.table_name LIKE 'tenant_%' THEN 2
    WHEN t.table_name IN (
      'calendar_events', 'checkin_instructions', 'commission_transactions',
      'content_datasets', 'content_templates', 'direct_reservations',
      'dpa_aceptaciones', 'external_calendars', 'facturas',
      'mir_comunicaciones', 'mir_configuraciones',
      'payment_attempts', 'payment_links', 'payment_notifications',
      'programmatic_leads', 'programmatic_page_metrics', 'programmatic_pages',
      'property_availability', 'property_availability_rules',
      'stripe_invoices'
    ) THEN 3
    ELSE 4
  END,
  t.table_name;

-- 2. RESUMEN: Tablas que DEBEN tener tenant_id pero NO lo tienen
SELECT 
  '🚨 TABLAS CRÍTICAS SIN tenant_id' as alerta,
  t.table_name,
  'Esta tabla almacena datos por tenant pero NO tiene columna tenant_id' as problema,
  'AGREGAR tenant_id URGENTEMENTE' as accion_requerida
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND (
    -- Tablas que definitivamente necesitan tenant_id
    t.table_name IN (
      'calendar_events', 'checkin_instructions', 'commission_transactions',
      'content_datasets', 'content_templates', 'direct_reservations',
      'dpa_aceptaciones', 'external_calendars', 'facturas',
      'mir_comunicaciones', 'mir_configuraciones',
      'payment_attempts', 'payment_links', 'payment_notifications',
      'programmatic_leads', 'programmatic_page_metrics', 'programmatic_pages',
      'property_availability', 'property_availability_rules',
      'stripe_invoices'
    )
    -- O tablas que empiezan con tenant_
    OR t.table_name LIKE 'tenant_%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.table_name 
      AND c.column_name = 'tenant_id'
  )
ORDER BY t.table_name;

-- 3. VERIFICAR TABLAS CON tenant_id QUE TIENEN VALORES NULL
SELECT 
  '⚠️ REGISTROS CON tenant_id NULL' as alerta,
  'guest_registrations' as tabla,
  COUNT(*) as registros_sin_tenant_id
FROM guest_registrations
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  '⚠️ REGISTROS CON tenant_id NULL' as alerta,
  'reservations' as tabla,
  COUNT(*) as registros_sin_tenant_id
FROM reservations
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  '⚠️ REGISTROS CON tenant_id NULL' as alerta,
  'guests' as tabla,
  COUNT(*) as registros_sin_tenant_id
FROM guests
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  '⚠️ REGISTROS CON tenant_id NULL' as alerta,
  'empresa_config' as tabla,
  COUNT(*) as registros_sin_tenant_id
FROM empresa_config
WHERE tenant_id IS NULL OR tenant_id = '';

-- 4. RESUMEN FINAL
SELECT 
  '📊 RESUMEN DE AISLAMIENTO MULTI-TENANT' as seccion,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tablas,
  (SELECT COUNT(*) FROM information_schema.columns c
   JOIN information_schema.tables t ON c.table_name = t.table_name
   WHERE c.table_schema = 'public' 
     AND c.column_name = 'tenant_id'
     AND t.table_type = 'BASE TABLE') as tablas_con_tenant_id,
  (SELECT COUNT(*) FROM information_schema.tables t
   WHERE t.table_schema = 'public' 
     AND t.table_type = 'BASE TABLE'
     AND (
       t.table_name IN (
         'calendar_events', 'checkin_instructions', 'commission_transactions',
         'content_datasets', 'content_templates', 'direct_reservations',
         'dpa_aceptaciones', 'external_calendars', 'facturas',
         'mir_comunicaciones', 'mir_configuraciones',
         'payment_attempts', 'payment_links', 'payment_notifications',
         'programmatic_leads', 'programmatic_page_metrics', 'programmatic_pages',
         'property_availability', 'property_availability_rules',
         'stripe_invoices'
       )
       OR t.table_name LIKE 'tenant_%'
     )
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns c 
       WHERE c.table_schema = 'public' 
         AND c.table_name = t.table_name 
         AND c.column_name = 'tenant_id'
     )
  ) as tablas_criticas_sin_tenant_id,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables t
          WHERE t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
            AND (
              t.table_name IN (
                'calendar_events', 'checkin_instructions', 'commission_transactions',
                'content_datasets', 'content_templates', 'direct_reservations',
                'dpa_aceptaciones', 'external_calendars', 'facturas',
                'mir_comunicaciones', 'mir_configuraciones',
                'payment_attempts', 'payment_links', 'payment_notifications',
                'programmatic_leads', 'programmatic_page_metrics', 'programmatic_pages',
                'property_availability', 'property_availability_rules',
                'stripe_invoices'
              )
              OR t.table_name LIKE 'tenant_%'
            )
            AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c 
              WHERE c.table_schema = 'public' 
                AND c.table_name = t.table_name 
                AND c.column_name = 'tenant_id'
            )
    ) > 0 
    THEN '❌ HAY PROBLEMAS - Tablas críticas sin tenant_id'
    ELSE '✅ TODO OK - Todas las tablas críticas tienen tenant_id'
  END as estado_general;

