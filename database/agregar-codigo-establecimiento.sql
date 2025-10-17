-- Agregar campo codigoEstablecimiento a la tabla mir_configuraciones
-- Este campo es diferente al codigoArrendador según las normas MIR

ALTER TABLE mir_configuraciones 
ADD COLUMN IF NOT EXISTS codigo_establecimiento VARCHAR(20);

-- Comentario explicativo
COMMENT ON COLUMN mir_configuraciones.codigo_establecimiento IS 'Código específico del establecimiento para comunicaciones MIR (diferente al código de arrendador)';

-- Actualizar el registro existente con el código correcto
UPDATE mir_configuraciones 
SET codigo_establecimiento = '0000256653' 
WHERE tenant_id = '870e589f-d313-4a5a-901f-f25fd4e7240a' 
AND codigo_establecimiento IS NULL;
