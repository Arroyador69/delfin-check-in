-- =====================================================
-- CREAR MAPPINGS DIRECTOS PARA HABITACIONES FALTANTES
-- =====================================================
-- Este script crea mappings directos entre las habitaciones
-- y propiedades que faltan (Habitación 4, 5, 6)
-- =====================================================

-- Primero, verificar el tenant_id correcto
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.lodging_id
FROM tenants t
WHERE t.lodging_id = 'cmgck7m8j00001rkf18baq79t'
LIMIT 1;

-- Crear mappings directos
-- Habitación 4 → Propiedad 28 (Habitación 4)
-- Habitación 5 → Propiedad 25 (Habitación 5)  
-- Habitación 6 → Propiedad 29 (Habitación 6)

INSERT INTO property_room_map (
    tenant_id,
    property_id,
    room_id,
    created_at,
    updated_at
)
SELECT 
    t.id as tenant_id,
    tp.id as property_id,
    r.id::text as room_id,
    NOW() as created_at,
    NOW() as updated_at
FROM tenants t
CROSS JOIN (
    VALUES 
        (4, 28),  -- Habitación 4 → Propiedad 28
        (5, 25),  -- Habitación 5 → Propiedad 25
        (6, 29)   -- Habitación 6 → Propiedad 29
) AS mappings(room_num, property_id)
JOIN "Room" r ON r.id = mappings.room_num AND r."lodgingId" = t.lodging_id
JOIN tenant_properties tp ON tp.id = mappings.property_id AND tp.tenant_id = t.id
WHERE t.lodging_id = 'cmgck7m8j00001rkf18baq79t'
AND NOT EXISTS (
    SELECT 1 FROM property_room_map prm
    WHERE prm.tenant_id = t.id
    AND prm.property_id = tp.id
)
ON CONFLICT (tenant_id, property_id) DO UPDATE
SET room_id = EXCLUDED.room_id,
    updated_at = NOW();

-- Verificar resultados
SELECT 
    'MAPPINGS DESPUÉS DE LA CREACIÓN' as estado,
    COUNT(*) as total_mappings
FROM property_room_map prm
JOIN tenants t ON prm.tenant_id = t.id
WHERE t.lodging_id = 'cmgck7m8j00001rkf18baq79t';

-- Mostrar todos los mappings
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
WHERE t.lodging_id = 'cmgck7m8j00001rkf18baq79t'
ORDER BY prm.property_id;

