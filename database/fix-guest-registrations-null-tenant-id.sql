-- ========================================
-- CORREGIR guest_registrations CON tenant_id NULL
-- ========================================
-- Este script identifica y corrige los registros de guest_registrations
-- que tienen tenant_id NULL (problema de seguridad crítico)

-- 1. VER REGISTROS CON tenant_id NULL (para identificar el problema)
SELECT 
  '🔍 REGISTROS CON tenant_id NULL' as seccion,
  gr.id,
  gr.reserva_ref,
  gr.fecha_entrada,
  gr.fecha_salida,
  gr.created_at,
  gr.tenant_id,
  'Este registro NO está asociado a ningún tenant' as problema
FROM guest_registrations gr
WHERE gr.tenant_id IS NULL
ORDER BY gr.created_at DESC;

-- 2. INTENTAR ASOCIAR CON RESERVAS (si existe reserva_ref)
-- Buscar el tenant_id desde la tabla reservations usando reserva_ref
SELECT 
  '🔗 INTENTANDO ASOCIAR CON RESERVAS' as seccion,
  gr.id as guest_registration_id,
  gr.reserva_ref,
  r.id as reservation_id,
  r.tenant_id as tenant_id_desde_reserva,
  CASE 
    WHEN r.tenant_id IS NOT NULL THEN '✅ Se puede asociar con tenant_id de reserva'
    ELSE '❌ No se encontró reserva asociada'
  END as estado
FROM guest_registrations gr
LEFT JOIN reservations r ON gr.reserva_ref = r.external_id OR gr.reserva_ref = r.id::text
WHERE gr.tenant_id IS NULL
ORDER BY gr.created_at DESC;

-- 3. ACTUALIZAR guest_registrations CON tenant_id DESDE reservations
-- ⚠️ IMPORTANTE: Ejecutar solo después de verificar los resultados de la query #2
-- Descomentar para ejecutar:

/*
UPDATE guest_registrations gr
SET tenant_id = r.tenant_id
FROM reservations r
WHERE gr.tenant_id IS NULL
  AND (gr.reserva_ref = r.external_id OR gr.reserva_ref = r.id::text)
  AND r.tenant_id IS NOT NULL;

-- Verificar cuántos se actualizaron
SELECT 
  '✅ REGISTROS CORREGIDOS' as seccion,
  COUNT(*) as total_corregidos
FROM guest_registrations
WHERE tenant_id IS NOT NULL;
*/

-- 4. REGISTROS QUE NO SE PUEDEN ASOCIAR (requieren acción manual)
SELECT 
  '⚠️ REGISTROS QUE REQUIEREN ACCIÓN MANUAL' as seccion,
  gr.id,
  gr.reserva_ref,
  gr.fecha_entrada,
  gr.fecha_salida,
  gr.created_at,
  'Este registro no tiene reserva asociada. Se debe asignar tenant_id manualmente o eliminar si es obsoleto.' as accion_requerida
FROM guest_registrations gr
LEFT JOIN reservations r ON gr.reserva_ref = r.external_id OR gr.reserva_ref = r.id::text
WHERE gr.tenant_id IS NULL
  AND r.id IS NULL;

-- 5. VERIFICACIÓN FINAL: Contar registros con tenant_id NULL después de la corrección
SELECT 
  '📊 VERIFICACIÓN FINAL' as seccion,
  COUNT(*) as registros_con_tenant_null,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ TODO OK - Todos los registros tienen tenant_id'
    WHEN COUNT(*) > 0 THEN '❌ AÚN HAY PROBLEMAS - ' || COUNT(*) || ' registros sin tenant_id'
  END as estado
FROM guest_registrations
WHERE tenant_id IS NULL;

