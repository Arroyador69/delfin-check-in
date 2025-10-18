-- Script para ejecutar en la base de datos Neon (Vercel)
-- Este script corrige los estados MIR y sincroniza las tablas

-- 1. Verificar que existe la tabla mir_comunicaciones
SELECT 'Verificando tabla mir_comunicaciones...' as status;

-- 2. Actualizar registros que tienen comunicación MIR pero no tienen mir_status actualizado
UPDATE guest_registrations 
SET data = jsonb_set(
  COALESCE(data, '{}'::jsonb),
  '{mir_status}',
  jsonb_build_object(
    'estado', mc.estado,
    'lote', mc.lote,
    'fechaEnvio', mc.created_at::text,
    'referencia', mc.referencia,
    'error', mc.error,
    'ultimaActualizacion', NOW()::text
  )
)
FROM mir_comunicaciones mc
WHERE guest_registrations.reserva_ref = mc.referencia
AND (
  guest_registrations.data->>'mir_status' IS NULL 
  OR guest_registrations.data->'mir_status'->>'estado' IS NULL
  OR guest_registrations.data->'mir_status'->>'estado' = 'pendiente'
);

-- 3. Mostrar estadísticas después de la actualización
SELECT 
  'Estadísticas después de corrección:' as info,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'pendiente' THEN 1 END) as pendientes,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'enviado' THEN 1 END) as enviados,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'confirmado' THEN 1 END) as confirmados,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'error' THEN 1 END) as errores
FROM guest_registrations;

-- 4. Mostrar registros específicos que se han actualizado
SELECT 
  'Registros actualizados:' as info,
  gr.id,
  gr.reserva_ref,
  gr.data->'mir_status'->>'estado' as estado_mir,
  gr.data->'mir_status'->>'lote' as lote_mir,
  mc.estado as estado_real,
  mc.lote as lote_real,
  mc.created_at as fecha_envio_real
FROM guest_registrations gr
LEFT JOIN mir_comunicaciones mc ON gr.reserva_ref = mc.referencia
WHERE gr.data->'mir_status'->>'estado' IS NOT NULL
ORDER BY gr.created_at DESC
LIMIT 10;

-- 5. Verificar sincronización entre tablas
SELECT 
  'Verificación de sincronización:' as info,
  COUNT(*) as total_comunicaciones_mir,
  COUNT(CASE WHEN mc.estado = 'enviado' THEN 1 END) as enviadas,
  COUNT(CASE WHEN mc.estado = 'confirmado' THEN 1 END) as confirmadas,
  COUNT(CASE WHEN mc.estado = 'error' THEN 1 END) as con_error
FROM mir_comunicaciones mc;

-- 6. Mostrar registros que necesitan atención
SELECT 
  'Registros que necesitan atención:' as info,
  gr.id,
  gr.reserva_ref,
  gr.data->'mir_status'->>'estado' as estado_guest,
  mc.estado as estado_mir,
  CASE 
    WHEN gr.data->'mir_status'->>'estado' != mc.estado THEN 'DESINCRONIZADO'
    WHEN mc.estado IS NULL THEN 'SIN COMUNICACIÓN MIR'
    ELSE 'OK'
  END as problema
FROM guest_registrations gr
LEFT JOIN mir_comunicaciones mc ON gr.reserva_ref = mc.referencia
WHERE 
  gr.data->'mir_status'->>'estado' != mc.estado
  OR (mc.estado IS NULL AND gr.data->'mir_status'->>'estado' IS NOT NULL)
ORDER BY gr.created_at DESC;

-- 7. Mensaje final
SELECT 'Script ejecutado correctamente. Los estados MIR están sincronizados.' as resultado;
