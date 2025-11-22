-- ========================================
-- AGREGAR tenant_id A TABLAS QUE LO NECESITAN
-- ========================================
-- Este script agrega la columna tenant_id a las tablas que deberían tenerla
-- pero actualmente no la tienen

-- ⚠️ IMPORTANTE: Revisar cada tabla antes de ejecutar para asegurar que realmente necesita tenant_id

-- 1. calendar_events - Eventos de calendario por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_events') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'calendar_events' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE calendar_events 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_id ON calendar_events(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a calendar_events';
    ELSE
      RAISE NOTICE 'ℹ️ calendar_events ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 2. checkin_instructions - Instrucciones de check-in por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'checkin_instructions') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'checkin_instructions' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE checkin_instructions 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_checkin_instructions_tenant_id ON checkin_instructions(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a checkin_instructions';
    ELSE
      RAISE NOTICE 'ℹ️ checkin_instructions ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 3. commission_transactions - Transacciones de comisión por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'commission_transactions') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'commission_transactions' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE commission_transactions 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_commission_transactions_tenant_id ON commission_transactions(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a commission_transactions';
    ELSE
      RAISE NOTICE 'ℹ️ commission_transactions ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 4. content_datasets - Datasets de contenido por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'content_datasets') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'content_datasets' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE content_datasets 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_content_datasets_tenant_id ON content_datasets(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a content_datasets';
    ELSE
      RAISE NOTICE 'ℹ️ content_datasets ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 5. content_templates - Plantillas de contenido por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'content_templates') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'content_templates' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE content_templates 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_content_templates_tenant_id ON content_templates(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a content_templates';
    ELSE
      RAISE NOTICE 'ℹ️ content_templates ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 6. direct_reservations - Reservas directas por tenant (verificar si ya tiene tenant_id)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'direct_reservations') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'direct_reservations' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE direct_reservations 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_direct_reservations_tenant_id ON direct_reservations(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a direct_reservations';
    ELSE
      RAISE NOTICE 'ℹ️ direct_reservations ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- NOTA: Las siguientes tablas pueden NO necesitar tenant_id:
-- - audit_log: Puede ser tabla global de auditoría (revisar caso de uso)
-- - lodging: Puede ser tabla maestra (revisar caso de uso)
-- - dpa_reservations: Verificar si es tabla de reservas o tabla de aceptaciones DPA

-- 7. VERIFICACIÓN FINAL: Listar tablas que aún no tienen tenant_id
SELECT 
  '📊 TABLAS QUE AÚN NO TIENEN tenant_id' as seccion,
  t.table_name,
  'Revisar si necesita tenant_id' as accion_requerida
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN ('audit_log', 'lodging', 'dpa_reservations')
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.table_name 
      AND c.column_name = 'tenant_id'
  )
ORDER BY t.table_name;

