-- ========================================
-- VERIFICAR POLÍTICAS RLS CREADAS
-- ========================================
-- Este script verifica que las políticas RLS estén creadas correctamente

-- Ver todas las políticas RLS activas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('empresa_config', 'tenant_users', 'reservations', 'guests', 'guest_registrations', 'property_room_map')
ORDER BY tablename, policyname;

-- Verificar que las funciones existen
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('current_tenant_id', 'current_tenant_id_varchar')
ORDER BY proname;

