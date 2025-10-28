-- Script para corregir lotes en mir_comunicaciones
-- Este script actualiza los lotes para usar los valores reales de la base de datos

-- 1. Ver el estado actual de los lotes
SELECT 
  'ESTADO ACTUAL DE LOTES' as descripcion,
  COUNT(*) as total_comunicaciones,
  COUNT(CASE WHEN lote IS NULL THEN 1 END) as lotes_nulos,
  COUNT(CASE WHEN lote LIKE 'LOTE-ADIL%' THEN 1 END) as lotes_adil,
  COUNT(CASE WHEN lote LIKE 'LOTE-%' AND lote NOT LIKE 'LOTE-ADIL%' THEN 1 END) as lotes_otros
FROM mir_comunicaciones;

-- 2. Mostrar algunos ejemplos de lotes actuales
SELECT 
  'EJEMPLOS DE LOTES ACTUALES' as descripcion,
  id,
  referencia,
  tipo,
  estado,
  lote,
  created_at
FROM mir_comunicaciones 
WHERE lote IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Actualizar lotes NULL con lotes únicos basados en la referencia
UPDATE mir_comunicaciones 
SET lote = 'LOTE-' || SUBSTRING(referencia FROM 6 FOR 8) || '-' || EXTRACT(EPOCH FROM created_at)::bigint
WHERE lote IS NULL 
  AND referencia IS NOT NULL 
  AND referencia != '';

-- 4. Actualizar lotes "ADIL" con lotes únicos basados en la referencia
UPDATE mir_comunicaciones 
SET lote = 'LOTE-' || SUBSTRING(referencia FROM 6 FOR 8) || '-' || EXTRACT(EPOCH FROM created_at)::bigint
WHERE lote LIKE 'LOTE-ADIL%';

-- 5. Verificar el resultado después de las actualizaciones
SELECT 
  'ESTADO DESPUÉS DE ACTUALIZACIÓN' as descripcion,
  COUNT(*) as total_comunicaciones,
  COUNT(CASE WHEN lote IS NULL THEN 1 END) as lotes_nulos,
  COUNT(CASE WHEN lote LIKE 'LOTE-ADIL%' THEN 1 END) as lotes_adil,
  COUNT(CASE WHEN lote LIKE 'LOTE-%' AND lote NOT LIKE 'LOTE-ADIL%' THEN 1 END) as lotes_otros
FROM mir_comunicaciones;

-- 6. Mostrar algunos ejemplos de los nuevos lotes
SELECT 
  'EJEMPLOS DE NUEVOS LOTES' as descripcion,
  id,
  referencia,
  tipo,
  estado,
  lote,
  created_at
FROM mir_comunicaciones 
WHERE lote IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;

-- 7. Verificar que no hay duplicados en lotes
SELECT 
  'VERIFICACIÓN DE DUPLICADOS EN LOTES' as descripcion,
  lote,
  COUNT(*) as cantidad
FROM mir_comunicaciones
WHERE lote IS NOT NULL
GROUP BY lote
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;





