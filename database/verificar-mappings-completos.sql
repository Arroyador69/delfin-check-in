-- =====================================================
-- VERIFICACIÓN COMPLETA DE MAPPINGS
-- =====================================================
-- Script para verificar que todos los mappings estén creados
-- =====================================================

-- 1. Verificar mappings existentes
SELECT 
    'MAPPINGS EXISTENTES' as estado,
    COUNT(*) as total
FROM property_room_map prm
JOIN tenants t ON prm.tenant_id = t.id
WHERE t.lodging_id = 'cmgck7m8j00001rkf18baq79t';

-- 2. Ver todas las propiedades activas del tenant
SELECT 
    'PROPIEDADES ACTIVAS' as tipo,
    tp.id as property_id,
    tp.property_name,
    tp.tenant_id,
    t.name as tenant_name,
    CASE WHEN prm.property_id IS NOT NULL THEN '✅ Con mapping' ELSE '❌ Sin mapping' END as estado_mapping
FROM tenant_properties tp
JOIN tenants t ON tp.tenant_id = t.id
LEFT JOIN property_room_map prm ON prm.property_id = tp.id AND prm.tenant_id = tp.tenant_id
WHERE t.lodging_id = 'cmgck7m8j00001rkf18baq79t'
AND tp.is_active = true
ORDER BY tp.id;

-- 3. Ver todas las habitaciones
SELECT 
    'HABITACIONES' as tipo,
    r.id as room_id,
    r.name as room_name,
    r."lodgingId" as lodging_id,
    CASE WHEN prm.room_id IS NOT NULL THEN '✅ Con mapping' ELSE '❌ Sin mapping' END as estado_mapping
FROM "Room" r
LEFT JOIN property_room_map prm ON prm.room_id = r.id::text
WHERE r."lodgingId" = 'cmgck7m8j00001rkf18baq79t'
ORDER BY r.id;

-- 4. RESUMEN FINAL
SELECT 
    'RESUMEN' as tipo,
    COUNT(DISTINCT r.id) as total_habitaciones,
    COUNT(DISTINCT tp.id) as total_propiedades_activas,
    COUNT(DISTINCT prm.property_id) as propiedades_con_mapping,
    COUNT(DISTINCT prm.room_id) as habitaciones_con_mapping
FROM "Room" r
CROSS JOIN tenant_properties tp
LEFT JOIN property_room_map prm ON prm.room_id = r.id::text AND prm.property_id = tp.id
JOIN tenants t ON tp.tenant_id = t.id
WHERE r."lodgingId" = 'cmgck7m8j00001rkf18baq79t'
AND t.lodging_id = 'cmgck7m8j00001rkf18baq79t'
AND tp.is_active = true;

