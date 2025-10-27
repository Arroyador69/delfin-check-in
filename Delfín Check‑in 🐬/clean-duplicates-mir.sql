-- Script para limpiar duplicados en mir_comunicaciones
-- Este script elimina comunicaciones duplicadas manteniendo solo la más reciente

-- 1. Ver el estado actual de duplicados
SELECT 
  'Duplicados actuales' as descripcion,
  referencia,
  COUNT(*) as cantidad,
  MIN(created_at) as primera_creacion,
  MAX(created_at) as ultima_creacion
FROM mir_comunicaciones
GROUP BY referencia
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- 2. Eliminar duplicados manteniendo solo el más reciente
-- Crear una tabla temporal con los IDs a mantener
WITH comunicaciones_a_mantener AS (
  SELECT DISTINCT ON (referencia)
    id,
    referencia,
    created_at
  FROM mir_comunicaciones
  ORDER BY referencia, created_at DESC
),
comunicaciones_a_eliminar AS (
  SELECT mc.id
  FROM mir_comunicaciones mc
  LEFT JOIN comunicaciones_a_mantener cm ON mc.id = cm.id
  WHERE cm.id IS NULL
)
DELETE FROM mir_comunicaciones 
WHERE id IN (SELECT id FROM comunicaciones_a_eliminar);

-- 3. Verificar el resultado
SELECT 
  'Estado después de limpieza' as descripcion,
  COUNT(*) as total_comunicaciones,
  COUNT(DISTINCT referencia) as referencias_unicas
FROM mir_comunicaciones;

-- 4. Mostrar algunas comunicaciones de ejemplo
SELECT 
  id,
  referencia,
  tipo,
  estado,
  lote,
  created_at,
  resultado::jsonb->>'codigoArrendador' as codigo_arrendador
FROM mir_comunicaciones 
ORDER BY created_at DESC 
LIMIT 10;
