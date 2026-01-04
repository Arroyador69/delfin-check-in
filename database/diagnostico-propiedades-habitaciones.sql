-- =====================================================
-- DIAGNÓSTICO: Propiedades vs Habitaciones
-- =====================================================
-- Este script te ayuda a entender la diferencia entre
-- propiedades (tenant_properties) y habitaciones (Room)
-- =====================================================

-- =====================================================
-- 1. VERIFICAR HABITACIONES EN Room
-- =====================================================
SELECT 
    '🏨 HABITACIONES EN Room' as tipo,
    COUNT(*) as total
FROM "Room"
UNION ALL
SELECT 
    '📋 PROPIEDADES EN tenant_properties' as tipo,
    COUNT(*) as total
FROM tenant_properties
UNION ALL
SELECT 
    '🔗 MAPPINGS EN property_room_map' as tipo,
    COUNT(*) as total
FROM property_room_map;

-- =====================================================
-- 2. HABITACIONES DETALLADAS
-- =====================================================
SELECT 
    'HABITACIONES' as seccion,
    r.id as room_id,
    r.name as room_name,
    r."lodgingId" as lodging_id,
    NULL::text as property_name,
    NULL::integer as property_id
FROM "Room" r
ORDER BY r.id;

-- =====================================================
-- 3. PROPIEDADES DETALLADAS
-- =====================================================
SELECT 
    'PROPIEDADES' as seccion,
    NULL::text as room_id,
    NULL::text as room_name,
    NULL::text as lodging_id,
    tp.property_name,
    tp.id as property_id
FROM tenant_properties tp
WHERE tp.is_active = true
ORDER BY tp.id;

-- =====================================================
-- 4. MAPPINGS (Conexiones entre propiedades y habitaciones)
-- =====================================================
SELECT 
    'MAPPINGS' as seccion,
    prm.room_id,
    r.name as room_name,
    NULL::text as lodging_id,
    tp.property_name,
    prm.property_id,
    t.name as tenant_name
FROM property_room_map prm
JOIN tenant_properties tp ON tp.id = prm.property_id
LEFT JOIN "Room" r ON r.id::text = prm.room_id
JOIN tenants t ON prm.tenant_id = t.id
ORDER BY prm.property_id;

-- =====================================================
-- 5. RESUMEN POR TENANT
-- =====================================================
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.email,
    t.lodging_id,
    COUNT(DISTINCT r.id) as total_habitaciones_room,
    COUNT(DISTINCT tp.id) as total_propiedades,
    COUNT(DISTINCT prm.property_id) as propiedades_con_mapping
FROM tenants t
LEFT JOIN "Room" r ON r."lodgingId" = t.lodging_id
LEFT JOIN tenant_properties tp ON tp.tenant_id = t.id AND tp.is_active = true
LEFT JOIN property_room_map prm ON prm.tenant_id = t.id
GROUP BY t.id, t.name, t.email, t.lodging_id
ORDER BY t.name;

-- =====================================================
-- 6. EXPLICACIÓN
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📚 EXPLICACIÓN';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'En el sistema hay DOS conceptos diferentes:';
    RAISE NOTICE '';
    RAISE NOTICE '1. HABITACIONES (Room):';
    RAISE NOTICE '   - Son las habitaciones físicas de tu hostal';
    RAISE NOTICE '   - Están en la tabla "Room"';
    RAISE NOTICE '   - Tienes 6 habitaciones: Habitación 1-6';
    RAISE NOTICE '';
    RAISE NOTICE '2. PROPIEDADES (tenant_properties):';
    RAISE NOTICE '   - Son las "propiedades" que usas en el sistema';
    RAISE NOTICE '   - Están en la tabla "tenant_properties"';
    RAISE NOTICE '   - El SuperAdmin muestra ESTAS propiedades';
    RAISE NOTICE '   - Pueden estar conectadas con habitaciones vía property_room_map';
    RAISE NOTICE '';
    RAISE NOTICE 'EN EL SUPERADMIN VES:';
    RAISE NOTICE '   → Propiedades de tenant_properties (NO habitaciones directamente)';
    RAISE NOTICE '';
    RAISE NOTICE 'EN LAS LANDINGS PÚBLICAS VES:';
    RAISE NOTICE '   → Las 6 habitaciones de Room (automáticamente)';
    RAISE NOTICE '';
    RAISE NOTICE 'Si no ves propiedades en SuperAdmin, necesitas crear';
    RAISE NOTICE 'propiedades en tenant_properties primero.';
    RAISE NOTICE '';
END $$;

