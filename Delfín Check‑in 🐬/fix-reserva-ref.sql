-- Script para corregir reserva_ref en guest_registrations
-- Este script actualiza reserva_ref para usar referencias únicas del sistema

-- 1. Primero, vamos a ver el estado actual
SELECT 
  'Estado actual' as descripcion,
  COUNT(*) as total_registros,
  COUNT(DISTINCT reserva_ref) as reservas_unicas,
  reserva_ref,
  COUNT(*) as cantidad_por_reserva
FROM guest_registrations 
GROUP BY reserva_ref
ORDER BY cantidad_por_reserva DESC;

-- 2. Actualizar reserva_ref para usar referencias únicas del sistema
-- Generar nuevas referencias únicas basadas en el ID y timestamp
UPDATE guest_registrations 
SET reserva_ref = 'REF-' || id::text || '-' || EXTRACT(EPOCH FROM created_at)::bigint
WHERE reserva_ref = '0000146967' OR reserva_ref IS NULL;

-- 3. Verificar el resultado
SELECT 
  'Estado después de actualización' as descripcion,
  COUNT(*) as total_registros,
  COUNT(DISTINCT reserva_ref) as reservas_unicas
FROM guest_registrations;

-- 4. Mostrar algunos ejemplos de las nuevas referencias
SELECT 
  id,
  reserva_ref,
  created_at,
  fecha_entrada,
  fecha_salida
FROM guest_registrations 
ORDER BY created_at DESC 
LIMIT 10;
