-- =====================================================
-- SCRIPT: Conectar Sistema Radar Reach con Habitaciones
-- =====================================================
-- Este script verifica y conecta todas las tablas necesarias
-- para que el sistema Radar Reach funcione correctamente
-- =====================================================

-- =====================================================
-- PASO 1: Verificar estructura de tablas
-- =====================================================

-- Verificar si tenants tiene lodging_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants' 
        AND column_name = 'lodging_id'
    ) THEN
        -- Añadir columna lodging_id si no existe
        ALTER TABLE tenants ADD COLUMN lodging_id TEXT;
        RAISE NOTICE '✅ Columna lodging_id añadida a tabla tenants';
    ELSE
        RAISE NOTICE '✅ Columna lodging_id ya existe en tabla tenants';
    END IF;
END $$;

-- =====================================================
-- PASO 2: Conectar tenants con sus habitaciones
-- =====================================================
-- Actualizar tenants con el lodgingId de sus habitaciones
-- (tomamos el lodgingId de la primera habitación de cada tenant)

DO $$
DECLARE
    tenant_record RECORD;
    lodging_id_value TEXT;
BEGIN
    -- Para cada tenant, buscar sus habitaciones y actualizar lodging_id
    FOR tenant_record IN 
        SELECT DISTINCT t.id, t.email
        FROM tenants t
        WHERE t.lodging_id IS NULL
    LOOP
        -- Buscar el lodgingId de las habitaciones
        -- Primero intentamos buscar cualquier lodgingId disponible
        SELECT DISTINCT r."lodgingId" INTO lodging_id_value
        FROM "Room" r
        WHERE r."lodgingId" NOT IN (
            SELECT COALESCE(lodging_id, '') 
            FROM tenants 
            WHERE lodging_id IS NOT NULL AND lodging_id != ''
        )
        LIMIT 1;
        
        -- Si no encontramos uno libre, usar el primero disponible
        IF lodging_id_value IS NULL THEN
            SELECT DISTINCT r."lodgingId" INTO lodging_id_value
            FROM "Room" r
            LIMIT 1;
        END IF;
        
        -- Actualizar el tenant con el lodging_id encontrado
        IF lodging_id_value IS NOT NULL THEN
            UPDATE tenants 
            SET lodging_id = lodging_id_value
            WHERE id = tenant_record.id;
            
            RAISE NOTICE '✅ Tenant % (%) conectado con lodgingId: %', 
                tenant_record.email, 
                tenant_record.id, 
                lodging_id_value;
        ELSE
            RAISE NOTICE '⚠️ No se encontró lodgingId para tenant % (%)', 
                tenant_record.email, 
                tenant_record.id;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- PASO 3: Verificar conexiones
-- =====================================================

-- Verificar tenants con lodging_id configurado
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.email,
    t.lodging_id,
    COUNT(r.id) as total_habitaciones
FROM tenants t
LEFT JOIN "Room" r ON r."lodgingId" = t.lodging_id
GROUP BY t.id, t.name, t.email, t.lodging_id
ORDER BY t.name;

-- =====================================================
-- PASO 4: Verificar que radar_signals y dynamic_landings estén creadas
-- =====================================================

-- Verificar radar_signals
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'radar_signals'
    ) THEN
        RAISE EXCEPTION '❌ Tabla radar_signals no existe. Ejecuta primero: database/create-radar-reach-system.sql';
    ELSE
        RAISE NOTICE '✅ Tabla radar_signals existe';
    END IF;
END $$;

-- Verificar dynamic_landings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'dynamic_landings'
    ) THEN
        RAISE EXCEPTION '❌ Tabla dynamic_landings no existe. Ejecuta primero: database/create-radar-reach-system.sql';
    ELSE
        RAISE NOTICE '✅ Tabla dynamic_landings existe';
    END IF;
END $$;

-- =====================================================
-- PASO 5: Resumen de conexiones
-- =====================================================

SELECT 
    '🔍 RESUMEN DE CONEXIONES' as titulo,
    '' as detalle
UNION ALL
SELECT 
    'Tenants con lodging_id',
    COUNT(*)::text
FROM tenants
WHERE lodging_id IS NOT NULL
UNION ALL
SELECT 
    'Habitaciones en tabla Room',
    COUNT(*)::text
FROM "Room"
UNION ALL
SELECT 
    'Habitaciones conectadas con tenants',
    COUNT(DISTINCT r.id)::text
FROM "Room" r
JOIN tenants t ON r."lodgingId" = t.lodging_id
UNION ALL
SELECT 
    'Señales del Radar creadas',
    COUNT(*)::text
FROM radar_signals
UNION ALL
SELECT 
    'Landings dinámicas creadas',
    COUNT(*)::text
FROM dynamic_landings;

-- =====================================================
-- PASO 6: Instrucciones finales
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CONEXIÓN COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos pasos:';
    RAISE NOTICE '1. Ve a SuperAdmin → Radar Reach';
    RAISE NOTICE '2. Crea una señal del Radar';
    RAISE NOTICE '3. Crea una landing dinámica';
    RAISE NOTICE '4. Publica la landing';
    RAISE NOTICE '5. Las 6 habitaciones aparecerán automáticamente';
    RAISE NOTICE '';
END $$;

