-- ========================================
-- CORRECCIÓN FINAL COMPLETA DE AISLAMIENTO MULTI-TENANT
-- ========================================
-- Este script corrige TODAS las tablas que faltan tenant_id y habilita RLS

-- ========================================
-- PARTE 1: AGREGAR tenant_id A TABLAS CRÍTICAS QUE FALTAN
-- ========================================

-- 1. calendar_events
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_events') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'calendar_events' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE calendar_events ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_id ON calendar_events(tenant_id);
      RAISE NOTICE '✅ tenant_id agregado a calendar_events';
    END IF;
  END IF;
END $$;

-- 2. tenant_name_history (CRÍTICO según resultados)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenant_name_history') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'tenant_name_history' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE tenant_name_history ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS idx_tenant_name_history_tenant_id ON tenant_name_history(tenant_id);
      RAISE NOTICE '✅ tenant_id agregado a tenant_name_history';
    END IF;
  END IF;
END $$;

-- 3. sublets (si es por tenant)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sublets') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'sublets' 
                     AND column_name = 'tenant_id') THEN
      -- Verificar si tiene alguna relación con tenant
      IF EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                   AND table_name = 'sublets' 
                   AND column_name IN ('property_id', 'owner_id', 'tenant_id')) THEN
        ALTER TABLE sublets ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_sublets_tenant_id ON sublets(tenant_id);
        RAISE NOTICE '✅ tenant_id agregado a sublets';
      END IF;
    END IF;
  END IF;
END $$;

-- 4. tags (si es por tenant)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tags') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'tags' 
                     AND column_name = 'tenant_id') THEN
      -- Verificar si tags son por tenant o globales
      IF EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                   AND table_name = 'tags' 
                   AND column_name IN ('property_id', 'reservation_id')) THEN
        ALTER TABLE tags ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON tags(tenant_id);
        RAISE NOTICE '✅ tenant_id agregado a tags';
      END IF;
    END IF;
  END IF;
END $$;

-- ========================================
-- PARTE 2: HABILITAR RLS EN TABLAS CRÍTICAS
-- ========================================

-- Habilitar RLS en todas las tablas con tenant_id
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns c 
        WHERE c.table_schema = 'public' 
          AND c.table_name = t.table_name 
          AND c.column_name = 'tenant_id'
      )
      AND t.table_name NOT IN ('tenants') -- Excluir tabla maestra
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
      RAISE NOTICE '✅ RLS habilitado en %', table_record.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error habilitando RLS en %: %', table_record.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- ========================================
-- PARTE 3: CREAR POLÍTICAS RLS PARA TABLAS CON tenant_id UUID
-- ========================================

-- Función helper para crear políticas RLS
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT table_name, column_name, data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name
    WHERE c.table_schema = 'public' 
      AND c.column_name = 'tenant_id'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT IN ('tenants', 'empresa_config') -- Excluir tablas con políticas especiales
  LOOP
    BEGIN
      -- Eliminar política existente si existe
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', table_record.table_name);
      
      -- Crear política para UUID
      IF table_record.data_type = 'uuid' THEN
        EXECUTE format('
          CREATE POLICY tenant_isolation_policy ON %I
          FOR ALL
          USING (tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)
          WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)
        ', table_record.table_name);
        RAISE NOTICE '✅ Política RLS creada para % (UUID)', table_record.table_name;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error creando política RLS en %: %', table_record.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- ========================================
-- PARTE 4: VERIFICACIÓN FINAL
-- ========================================

-- Verificar tablas sin tenant_id que deberían tenerlo
SELECT 
  '🚨 TABLAS CRÍTICAS SIN tenant_id' as alerta,
  t.table_name,
  'AGREGAR tenant_id URGENTEMENTE' as accion
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN (
    'calendar_events', 'tenant_name_history'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.table_name 
      AND c.column_name = 'tenant_id'
  );

-- Verificar tablas con tenant_id pero sin RLS
SELECT 
  '⚠️ TABLAS CON tenant_id PERO SIN RLS' as alerta,
  t.table_name,
  'HABILITAR RLS URGENTEMENTE' as accion
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.table_name 
      AND c.column_name = 'tenant_id'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = t.table_name
  )
  AND t.table_name NOT IN ('tenants')
ORDER BY t.table_name;

-- Resumen final
SELECT 
  '📊 RESUMEN FINAL DE AISLAMIENTO' as seccion,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tablas,
  (SELECT COUNT(*) FROM information_schema.columns c
   JOIN information_schema.tables t ON c.table_name = t.table_name
   WHERE c.table_schema = 'public' 
     AND c.column_name = 'tenant_id'
     AND t.table_type = 'BASE TABLE') as tablas_con_tenant_id,
  (SELECT COUNT(*) FROM pg_tables 
   WHERE schemaname = 'public' 
     AND rowsecurity = true) as tablas_con_rls_habilitado,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables t
          WHERE t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
            AND t.table_name IN ('calendar_events', 'tenant_name_history')
            AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c 
              WHERE c.table_schema = 'public' 
                AND c.table_name = t.table_name 
                AND c.column_name = 'tenant_id'
            )) = 0
    THEN '✅ TODO CORREGIDO - Todas las tablas críticas tienen tenant_id'
    ELSE '❌ AÚN FALTAN CORRECCIONES'
  END as estado_final;


