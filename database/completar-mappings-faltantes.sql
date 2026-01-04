-- =====================================================
-- COMPLETAR MAPPINGS FALTANTES
-- =====================================================
-- Este script completa los mappings que faltan entre
-- habitaciones (Room) y propiedades (tenant_properties)
-- =====================================================

-- =====================================================
-- PASO 1: Ver qué mappings faltan
-- =====================================================
SELECT 
    'HABITACIONES SIN MAPPING' as estado,
    r.id as room_id,
    r.name as room_name,
    r."lodgingId" as lodging_id
FROM "Room" r
LEFT JOIN property_room_map prm ON prm.room_id = r.id::text
WHERE prm.room_id IS NULL
ORDER BY r.id;

-- =====================================================
-- PASO 2: Ver qué propiedades no tienen mapping
-- =====================================================
SELECT 
    'PROPIEDADES SIN MAPPING' as estado,
    tp.id as property_id,
    tp.property_name,
    tp.tenant_id
FROM tenant_properties tp
LEFT JOIN property_room_map prm ON prm.property_id = tp.id
WHERE prm.property_id IS NULL
AND tp.is_active = true
ORDER BY tp.id;

-- =====================================================
-- PASO 3: Completar mappings automáticamente
-- =====================================================
-- Para cada habitación sin mapping, buscar una propiedad sin mapping del mismo tenant
DO $$
DECLARE
    room_record RECORD;
    property_record RECORD;
    tenant_id_value UUID;
    lodging_id_value TEXT;
BEGIN
    -- Para cada habitación sin mapping
    FOR room_record IN 
        SELECT r.id, r.name, r."lodgingId"
        FROM "Room" r
        LEFT JOIN property_room_map prm ON prm.room_id = r.id::text
        WHERE prm.room_id IS NULL
        ORDER BY r.id
    LOOP
        lodging_id_value := room_record."lodgingId";
        
        -- Buscar el tenant_id correspondiente a este lodgingId
        SELECT id INTO tenant_id_value
        FROM tenants
        WHERE lodging_id = lodging_id_value
        LIMIT 1;
        
        IF tenant_id_value IS NOT NULL THEN
            -- Buscar una propiedad sin mapping del mismo tenant
            SELECT tp.id, tp.property_name INTO property_record
            FROM tenant_properties tp
            LEFT JOIN property_room_map prm2 ON prm2.property_id = tp.id
            WHERE tp.tenant_id = tenant_id_value
            AND tp.is_active = true
            AND prm2.property_id IS NULL
            ORDER BY tp.id
            LIMIT 1;
            
            -- Si encontramos una propiedad sin mapping, crear el mapping
            IF property_record.id IS NOT NULL THEN
                INSERT INTO property_room_map (
                    tenant_id,
                    property_id,
                    room_id,
                    created_at,
                    updated_at
                ) VALUES (
                    tenant_id_value,
                    property_record.id,
                    room_record.id::text,
                    NOW(),
                    NOW()
                )
                ON CONFLICT (tenant_id, property_id) DO UPDATE
                SET room_id = EXCLUDED.room_id,
                    updated_at = NOW();
                
                RAISE NOTICE '✅ Mapping creado: Habitación % → Propiedad % (%)', 
                    room_record.name,
                    property_record.property_name,
                    property_record.id;
            ELSE
                RAISE NOTICE '⚠️ No hay propiedades disponibles para mapear con Habitación %', 
                    room_record.name;
            END IF;
        ELSE
            RAISE NOTICE '⚠️ No se encontró tenant para lodgingId % (Habitación %)', 
                lodging_id_value,
                room_record.name;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- PASO 4: Verificar resultados
-- =====================================================
SELECT 
    'RESUMEN FINAL' as tipo,
    COUNT(DISTINCT r.id) as total_habitaciones,
    COUNT(DISTINCT tp.id) as total_propiedades,
    COUNT(DISTINCT prm.property_id) as propiedades_con_mapping,
    COUNT(DISTINCT prm.room_id) as habitaciones_con_mapping
FROM "Room" r
CROSS JOIN tenant_properties tp
LEFT JOIN property_room_map prm ON prm.room_id = r.id::text AND prm.property_id = tp.id
WHERE tp.is_active = true;

-- =====================================================
-- PASO 5: Mostrar todos los mappings
-- =====================================================
SELECT 
    prm.room_id,
    r.name as room_name,
    prm.property_id,
    tp.property_name,
    t.name as tenant_name
FROM property_room_map prm
JOIN "Room" r ON r.id::text = prm.room_id
JOIN tenant_properties tp ON tp.id = prm.property_id
JOIN tenants t ON prm.tenant_id = t.id
ORDER BY prm.property_id;

