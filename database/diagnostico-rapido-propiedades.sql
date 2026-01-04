-- =====================================================
-- DIAGNÓSTICO RÁPIDO: Propiedades en SuperAdmin
-- =====================================================
-- Ejecuta este query para verificar por qué no aparecen
-- las propiedades en el SuperAdmin
-- =====================================================

-- 1. ¿Cuántas propiedades activas hay?
SELECT 
    'PROPIEDADES ACTIVAS' as tipo,
    COUNT(*) as total
FROM tenant_properties
WHERE is_active = true;

-- 2. Listar todas las propiedades activas
SELECT 
    tp.id,
    tp.property_name,
    tp.is_active,
    tp.tenant_id,
    t.name as tenant_name,
    t.email as tenant_email
FROM tenant_properties tp
JOIN tenants t ON tp.tenant_id = t.id
WHERE tp.is_active = true
ORDER BY t.name, tp.property_name;

-- 3. Propiedades inactivas (por si acaso)
SELECT 
    'PROPIEDADES INACTIVAS' as estado,
    COUNT(*) as total
FROM tenant_properties
WHERE is_active = false;

-- 4. Resumen por tenant
SELECT 
    t.name as tenant_name,
    COUNT(tp.id) as total_propiedades,
    COUNT(tp.id) FILTER (WHERE tp.is_active = true) as propiedades_activas
FROM tenants t
LEFT JOIN tenant_properties tp ON tp.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

