-- Script para crear vinculación consistente entre tablas
-- Este script añade una columna común para vincular guest_registrations y mir_comunicaciones

-- 1. Añadir columna de vinculación a guest_registrations
ALTER TABLE guest_registrations 
ADD COLUMN IF NOT EXISTS comunicacion_id VARCHAR(100);

-- 2. Añadir columna de vinculación a mir_comunicaciones  
ALTER TABLE mir_comunicaciones 
ADD COLUMN IF NOT EXISTS guest_registration_id VARCHAR(100);

-- 3. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_guest_registrations_comunicacion_id 
ON guest_registrations(comunicacion_id);

CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_guest_registration_id 
ON mir_comunicaciones(guest_registration_id);

-- 4. Actualizar registros existentes para crear vinculaciones
-- Para guest_registrations que tienen mir_status pero no están vinculados
UPDATE guest_registrations 
SET comunicacion_id = CONCAT('GUEST-', id, '-', EXTRACT(EPOCH FROM created_at)::bigint)
WHERE comunicacion_id IS NULL 
AND data->'mir_status' IS NOT NULL;

-- Para mir_comunicaciones que no están vinculados
UPDATE mir_comunicaciones 
SET guest_registration_id = CONCAT('MIR-', id, '-', EXTRACT(EPOCH FROM created_at)::bigint)
WHERE guest_registration_id IS NULL;

-- 5. Crear vinculaciones basadas en código de arrendador
UPDATE guest_registrations gr
SET comunicacion_id = mc.referencia
FROM mir_comunicaciones mc
WHERE gr.reserva_ref = mc.resultado::jsonb->>'codigoArrendador'
AND gr.comunicacion_id IS NULL
AND mc.referencia IS NOT NULL;

UPDATE mir_comunicaciones mc
SET guest_registration_id = gr.id
FROM guest_registrations gr
WHERE mc.resultado::jsonb->>'codigoArrendador' = gr.reserva_ref
AND mc.guest_registration_id IS NULL
AND gr.id IS NOT NULL;





