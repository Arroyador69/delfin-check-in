-- ========================================
-- VERIFICACIÓN COMPLETA DE ROW LEVEL SECURITY (RLS)
-- ========================================
-- Este script verifica que RLS está habilitado y configurado correctamente
-- en todas las tablas multi-tenant

-- ========================================
-- 1. VERIFICAR TABLAS CON tenant_id
-- ========================================
SELECT 
  '📊 TABLAS CON tenant_id' as seccion,
  t.table_name,
  c.column_name,
  c.data_type,
  CASE 
    WHEN c.data_type = 'uuid' THEN 'UUID'
    WHEN c.data_type = 'character varying' THEN 'VARCHAR'
    ELSE c.data_type
  END as tipo_tenant_id
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND c.column_name = 'tenant_id'
  AND t.table_name != 'tenants'
ORDER BY t.table_name;

-- ========================================
-- 2. VERIFICAR RLS HABILITADO
-- ========================================
SELECT 
  '🔒 ESTADO DE RLS' as seccion,
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ HABILITADO'
    ELSE '❌ DESHABILITADO'
  END as estado_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      AND c.column_name = 'tenant_id'
      AND t.table_name != 'tenants'
  )
ORDER BY tablename;

-- ========================================
-- 3. VERIFICAR POLÍTICAS RLS
-- ========================================
SELECT 
  '🛡️ POLÍTICAS RLS' as seccion,
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
  AND tablename IN (
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      AND c.column_name = 'tenant_id'
      AND t.table_name != 'tenants'
  )
ORDER BY tablename, policyname;

-- ========================================
-- 4. TABLAS CON tenant_id PERO SIN RLS
-- ========================================
SELECT 
  '⚠️ TABLAS SIN RLS (CRÍTICO)' as alerta,
  t.table_name,
  'EJECUTAR: ALTER TABLE ' || t.table_name || ' ENABLE ROW LEVEL SECURITY;' as comando
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.table_name 
      AND c.column_name = 'tenant_id'
  )
  AND t.table_name != 'tenants'
  AND NOT EXISTS (
    SELECT 1 FROM pg_tables pt
    WHERE pt.schemaname = 'public'
      AND pt.tablename = t.table_name
      AND pt.rowsecurity = true
  )
ORDER BY t.table_name;

-- ========================================
-- 5. TABLAS CON RLS PERO SIN POLÍTICAS
-- ========================================
SELECT 
  '⚠️ TABLAS CON RLS PERO SIN POLÍTICAS' as alerta,
  pt.tablename,
  'CREAR POLÍTICA RLS' as accion
FROM pg_tables pt
WHERE pt.schemaname = 'public'
  AND pt.rowsecurity = true
  AND pt.tablename != 'tenants'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies pp
    WHERE pp.schemaname = 'public'
      AND pp.tablename = pt.tablename
  )
ORDER BY pt.tablename;

-- ========================================
-- 6. VERIFICAR FUNCIONES RLS
-- ========================================
SELECT 
  '🔧 FUNCIONES RLS' as seccion,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('current_tenant_id', 'current_tenant_id_varchar')
ORDER BY p.proname;

-- ========================================
-- 7. RESUMEN FINAL
-- ========================================
SELECT 
  '📊 RESUMEN FINAL' as seccion,
  (SELECT COUNT(*) FROM information_schema.tables t
   JOIN information_schema.columns c ON t.table_name = c.table_name
   WHERE t.table_schema = 'public' 
     AND t.table_type = 'BASE TABLE'
     AND c.column_name = 'tenant_id'
     AND t.table_name != 'tenants') as total_tablas_con_tenant_id,
  
  (SELECT COUNT(*) FROM pg_tables pt
   WHERE pt.schemaname = 'public'
     AND pt.rowsecurity = true
     AND pt.tablename != 'tenants') as total_tablas_con_rls,
  
  (SELECT COUNT(*) FROM pg_policies pp
   WHERE pp.schemaname = 'public'
     AND pp.tablename != 'tenants') as total_politicas_rls,
  
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.column_name = 'tenant_id'
        AND t.table_name != 'tenants'
        AND NOT EXISTS (
          SELECT 1 FROM pg_tables pt
          WHERE pt.schemaname = 'public'
            AND pt.tablename = t.table_name
            AND pt.rowsecurity = true
        )
    ) = 0
    THEN '✅ TODAS LAS TABLAS TIENEN RLS HABILITADO'
    ELSE '❌ HAY TABLAS SIN RLS - EJECUTAR corregir-todo-aislamiento-final.sql'
  END as estado_final;

