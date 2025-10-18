-- Script corregido para Neon Database
-- Ejecutar paso a paso para evitar errores

-- PASO 1: Verificar que existen las tablas
SELECT 'PASO 1: Verificando tablas...' as status;

SELECT 
  'Tabla guest_registrations:' as tabla,
  COUNT(*) as total_registros
FROM guest_registrations;

SELECT 
  'Tabla mir_comunicaciones:' as tabla,
  COUNT(*) as total_comunicaciones
FROM mir_comunicaciones;

-- PASO 2: Ver estado actual antes de corregir
SELECT 'PASO 2: Estado actual antes de corregir...' as status;

SELECT 
  'Estado actual en guest_registrations:' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'pendiente' THEN 1 END) as pendientes,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'enviado' THEN 1 END) as enviados,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'confirmado' THEN 1 END) as confirmados,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'error' THEN 1 END) as errores
FROM guest_registrations;

-- PASO 3: Ver comunicaciones MIR existentes
SELECT 'PASO 3: Comunicaciones MIR existentes...' as status;

SELECT 
  referencia,
  estado,
  lote,
  created_at,
  error
FROM mir_comunicaciones
ORDER BY created_at DESC
LIMIT 10;

-- PASO 4: Corregir estados usando UPDATE con JOIN explícito
SELECT 'PASO 4: Corrigiendo estados...' as status;

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

-- PASO 5: Verificar estado después de la corrección
SELECT 'PASO 5: Estado después de corregir...' as status;

SELECT 
  'Estado después de corrección:' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'pendiente' THEN 1 END) as pendientes,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'enviado' THEN 1 END) as enviados,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'confirmado' THEN 1 END) as confirmados,
  COUNT(CASE WHEN data->'mir_status'->>'estado' = 'error' THEN 1 END) as errores
FROM guest_registrations;

-- PASO 6: Buscar específicamente el registro de Adil
SELECT 'PASO 6: Buscando registro de Adil...' as status;

SELECT 
  gr.id,
  gr.reserva_ref,
  gr.data->'mir_status'->>'estado' as estado_mir,
  gr.data->'mir_status'->>'lote' as lote_mir,
  mc.estado as estado_real,
  mc.lote as lote_real,
  mc.created_at as fecha_envio_real,
  gr.data->'comunicaciones'->0->'personas'->0->>'nombre' as nombre,
  gr.data->'comunicaciones'->0->'personas'->0->>'apellido1' as apellido1
FROM guest_registrations gr
LEFT JOIN mir_comunicaciones mc ON gr.reserva_ref = mc.referencia
WHERE 
  gr.data->'comunicaciones'->0->'personas'->0->>'nombre' ILIKE '%adil%'
  OR gr.data->'comunicaciones'->0->'personas'->0->>'apellido1' ILIKE '%rahal%'
ORDER BY gr.created_at DESC;

-- PASO 7: Mostrar todos los registros con su estado actual
SELECT 'PASO 7: Estado final de todos los registros...' as status;

SELECT 
  gr.id,
  gr.reserva_ref,
  gr.data->'comunicaciones'->0->'personas'->0->>'nombre' as nombre,
  gr.data->'comunicaciones'->0->'personas'->0->>'apellido1' as apellido1,
  gr.data->'mir_status'->>'estado' as estado_mir,
  gr.data->'mir_status'->>'lote' as lote_mir,
  mc.estado as estado_real,
  mc.lote as lote_real
FROM guest_registrations gr
LEFT JOIN mir_comunicaciones mc ON gr.reserva_ref = mc.referencia
ORDER BY gr.created_at DESC
LIMIT 10;

