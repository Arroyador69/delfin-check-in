-- Script simple para corregir solo el registro de Adil
-- Ejecutar este script paso a paso

-- 1. Buscar el registro de Adil
SELECT 
  'Buscando registro de Adil...' as info,
  gr.id,
  gr.reserva_ref,
  gr.data->'comunicaciones'->0->'personas'->0->>'nombre' as nombre,
  gr.data->'comunicaciones'->0->'personas'->0->>'apellido1' as apellido1,
  gr.data->'mir_status'->>'estado' as estado_actual
FROM guest_registrations gr
WHERE 
  gr.data->'comunicaciones'->0->'personas'->0->>'nombre' ILIKE '%adil%'
  OR gr.data->'comunicaciones'->0->'personas'->0->>'apellido1' ILIKE '%rahal%';

-- 2. Ver si tiene comunicación MIR
SELECT 
  'Comunicación MIR de Adil...' as info,
  mc.referencia,
  mc.estado,
  mc.lote,
  mc.created_at
FROM mir_comunicaciones mc
WHERE mc.referencia IN (
  SELECT gr.reserva_ref
  FROM guest_registrations gr
  WHERE 
    gr.data->'comunicaciones'->0->'personas'->0->>'nombre' ILIKE '%adil%'
    OR gr.data->'comunicaciones'->0->'personas'->0->>'apellido1' ILIKE '%rahal%'
);

-- 3. Actualizar solo el registro de Adil (ejecutar solo si existe comunicación MIR)
UPDATE guest_registrations 
SET data = jsonb_set(
  COALESCE(data, '{}'::jsonb),
  '{mir_status}',
  jsonb_build_object(
    'estado', 'enviado',
    'lote', 'LOTE-ADIL-001',
    'fechaEnvio', NOW()::text,
    'referencia', reserva_ref,
    'ultimaActualizacion', NOW()::text
  )
)
WHERE reserva_ref IN (
  SELECT gr.reserva_ref
  FROM guest_registrations gr
  WHERE 
    gr.data->'comunicaciones'->0->'personas'->0->>'nombre' ILIKE '%adil%'
    OR gr.data->'comunicaciones'->0->'personas'->0->>'apellido1' ILIKE '%rahal%'
);

-- 4. Verificar el resultado
SELECT 
  'Resultado después de actualizar...' as info,
  gr.id,
  gr.reserva_ref,
  gr.data->'comunicaciones'->0->'personas'->0->>'nombre' as nombre,
  gr.data->'comunicaciones'->0->'personas'->0->>'apellido1' as apellido1,
  gr.data->'mir_status'->>'estado' as estado_actualizado
FROM guest_registrations gr
WHERE 
  gr.data->'comunicaciones'->0->'personas'->0->>'nombre' ILIKE '%adil%'
  OR gr.data->'comunicaciones'->0->'personas'->0->>'apellido1' ILIKE '%rahal%';
