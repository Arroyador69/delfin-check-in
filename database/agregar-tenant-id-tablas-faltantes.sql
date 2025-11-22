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

-- 7. dpa_aceptaciones - Aceptaciones DPA por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dpa_aceptaciones') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'dpa_aceptaciones' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE dpa_aceptaciones 
      ADD COLUMN tenant_id VARCHAR(255);
      
      CREATE INDEX IF NOT EXISTS idx_dpa_aceptaciones_tenant_id ON dpa_aceptaciones(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a dpa_aceptaciones';
    ELSE
      RAISE NOTICE 'ℹ️ dpa_aceptaciones ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 8. external_calendars - Calendarios externos por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'external_calendars') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'external_calendars' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE external_calendars 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_external_calendars_tenant_id ON external_calendars(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a external_calendars';
    ELSE
      RAISE NOTICE 'ℹ️ external_calendars ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 9. facturas - Facturas por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facturas') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'facturas' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE facturas 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_facturas_tenant_id ON facturas(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a facturas';
    ELSE
      RAISE NOTICE 'ℹ️ facturas ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 10. mir_comunicaciones - Comunicaciones MIR por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mir_comunicaciones') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'mir_comunicaciones' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE mir_comunicaciones 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_tenant_id ON mir_comunicaciones(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a mir_comunicaciones';
    ELSE
      RAISE NOTICE 'ℹ️ mir_comunicaciones ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 11. mir_configuraciones - Configuraciones MIR por tenant (verificar si usa propietario_id)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mir_configuraciones') THEN
    -- Verificar si ya tiene tenant_id o propietario_id
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'mir_configuraciones' 
                 AND column_name = 'propietario_id') THEN
      RAISE NOTICE 'ℹ️ mir_configuraciones usa propietario_id (puede ser equivalente a tenant_id)';
    ELSIF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                        AND table_name = 'mir_configuraciones' 
                        AND column_name = 'tenant_id') THEN
      ALTER TABLE mir_configuraciones 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_mir_configuraciones_tenant_id ON mir_configuraciones(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a mir_configuraciones';
    ELSE
      RAISE NOTICE 'ℹ️ mir_configuraciones ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 12. payment_attempts - Intentos de pago por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_attempts') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'payment_attempts' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE payment_attempts 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_payment_attempts_tenant_id ON payment_attempts(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a payment_attempts';
    ELSE
      RAISE NOTICE 'ℹ️ payment_attempts ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 13. payment_links - Enlaces de pago por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_links') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'payment_links' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE payment_links 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_payment_links_tenant_id ON payment_links(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a payment_links';
    ELSE
      RAISE NOTICE 'ℹ️ payment_links ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 14. payment_notifications - Notificaciones de pago por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_notifications') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'payment_notifications' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE payment_notifications 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_payment_notifications_tenant_id ON payment_notifications(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a payment_notifications';
    ELSE
      RAISE NOTICE 'ℹ️ payment_notifications ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 15. programmatic_leads - Leads programáticos por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'programmatic_leads') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'programmatic_leads' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE programmatic_leads 
      ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_programmatic_leads_tenant_id ON programmatic_leads(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a programmatic_leads';
    ELSE
      RAISE NOTICE 'ℹ️ programmatic_leads ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 16. programmatic_page_metrics - Métricas de páginas programáticas por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'programmatic_page_metrics') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'programmatic_page_metrics' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE programmatic_page_metrics 
      ADD COLUMN tenant_id VARCHAR(255);
      
      CREATE INDEX IF NOT EXISTS idx_programmatic_page_metrics_tenant_id ON programmatic_page_metrics(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a programmatic_page_metrics';
    ELSE
      RAISE NOTICE 'ℹ️ programmatic_page_metrics ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 17. programmatic_pages - Páginas programáticas por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'programmatic_pages') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'programmatic_pages' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE programmatic_pages 
      ADD COLUMN tenant_id VARCHAR(255);
      
      CREATE INDEX IF NOT EXISTS idx_programmatic_pages_tenant_id ON programmatic_pages(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a programmatic_pages';
    ELSE
      RAISE NOTICE 'ℹ️ programmatic_pages ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 18. property_availability - Disponibilidad de propiedades por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_availability') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'property_availability' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE property_availability 
      ADD COLUMN tenant_id VARCHAR(255);
      
      CREATE INDEX IF NOT EXISTS idx_property_availability_tenant_id ON property_availability(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a property_availability';
    ELSE
      RAISE NOTICE 'ℹ️ property_availability ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 19. property_availability_rules - Reglas de disponibilidad por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_availability_rules') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'property_availability_rules' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE property_availability_rules 
      ADD COLUMN tenant_id VARCHAR(255);
      
      CREATE INDEX IF NOT EXISTS idx_property_availability_rules_tenant_id ON property_availability_rules(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a property_availability_rules';
    ELSE
      RAISE NOTICE 'ℹ️ property_availability_rules ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- 20. stripe_invoices - Facturas de Stripe por tenant
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_invoices') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'stripe_invoices' 
                     AND column_name = 'tenant_id') THEN
      ALTER TABLE stripe_invoices 
      ADD COLUMN tenant_id VARCHAR(255);
      
      CREATE INDEX IF NOT EXISTS idx_stripe_invoices_tenant_id ON stripe_invoices(tenant_id);
      
      RAISE NOTICE '✅ Columna tenant_id agregada a stripe_invoices';
    ELSE
      RAISE NOTICE 'ℹ️ stripe_invoices ya tiene tenant_id';
    END IF;
  END IF;
END $$;

-- NOTA: Las siguientes tablas pueden NO necesitar tenant_id:
-- - audit_log: Puede ser tabla global de auditoría (revisar caso de uso)
-- - lodging: Puede ser tabla maestra (revisar caso de uso)
-- - Room: Puede ser tabla maestra (revisar caso de uso)
-- - error_logs: Puede ser tabla global de errores (revisar caso de uso)

-- 21. VERIFICACIÓN FINAL: Listar tablas que aún no tienen tenant_id
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

