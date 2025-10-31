-- =====================================================
-- SCRIPT DE VERIFICACIÓN DE CONEXIONES MULTITENANT
-- =====================================================

-- Verificar que todas las tablas tienen tenant_id correctamente configurado
SELECT 
  'tenant_properties' as tabla,
  COUNT(*) as total_registros,
  COUNT(DISTINCT tenant_id) as tenants_unicos
FROM tenant_properties
UNION ALL
SELECT 
  'direct_reservations' as tabla,
  COUNT(*) as total_registros,
  COUNT(DISTINCT tenant_id) as tenants_unicos
FROM direct_reservations
UNION ALL
SELECT 
  'commission_transactions' as tabla,
  COUNT(*) as total_registros,
  COUNT(DISTINCT tenant_id) as tenants_unicos
FROM commission_transactions
UNION ALL
SELECT 
  'tenant_commission_settings' as tabla,
  COUNT(*) as total_registros,
  COUNT(DISTINCT tenant_id) as tenants_unicos
FROM tenant_commission_settings;

-- Verificar foreign keys
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('tenant_properties', 'direct_reservations', 'commission_transactions', 'property_availability')
ORDER BY tc.table_name, kcu.column_name;

-- Verificar índices para optimización multitentant
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('tenant_properties', 'direct_reservations', 'commission_transactions', 'property_availability')
  AND indexname LIKE '%tenant%'
ORDER BY tablename, indexname;

-- Verificar funciones y triggers
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('generate_reservation_code', 'calculate_commission', 'update_updated_at_column')
ORDER BY routine_name;







