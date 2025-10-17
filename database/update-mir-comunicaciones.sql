-- Script para actualizar la tabla mir_comunicaciones a la estructura correcta
-- Ejecutar este script en la base de datos de producción

-- Primero, crear una tabla temporal con la estructura correcta
CREATE TABLE IF NOT EXISTS mir_comunicaciones_new (
    id SERIAL PRIMARY KEY,
    referencia VARCHAR(255) UNIQUE NOT NULL,
    tipo VARCHAR(10) DEFAULT 'PV',
    estado VARCHAR(50) DEFAULT 'pendiente',
    lote VARCHAR(255),
    resultado TEXT,
    error TEXT,
    xml_enviado TEXT,
    xml_respuesta TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrar datos existentes si los hay
INSERT INTO mir_comunicaciones_new (
    id, referencia, tipo, estado, lote, resultado, error, xml_enviado, xml_respuesta, created_at, updated_at
)
SELECT 
    id,
    referencia,
    'PV' as tipo,
    estado,
    lote,
    resultado::TEXT,
    error,
    datos::TEXT as xml_enviado,
    resultado::TEXT as xml_respuesta,
    created_at,
    updated_at
FROM mir_comunicaciones
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mir_comunicaciones');

-- Eliminar la tabla antigua
DROP TABLE IF EXISTS mir_comunicaciones;

-- Renombrar la nueva tabla
ALTER TABLE mir_comunicaciones_new RENAME TO mir_comunicaciones;

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_estado ON mir_comunicaciones(estado);
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_referencia ON mir_comunicaciones(referencia);
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_lote ON mir_comunicaciones(lote);
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_created_at ON mir_comunicaciones(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_mir_comunicaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_mir_comunicaciones_updated_at ON mir_comunicaciones;
CREATE TRIGGER update_mir_comunicaciones_updated_at
    BEFORE UPDATE ON mir_comunicaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_mir_comunicaciones_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE mir_comunicaciones IS 'Almacena las comunicaciones enviadas al Ministerio del Interior';
COMMENT ON COLUMN mir_comunicaciones.referencia IS 'Referencia única de la comunicación';
COMMENT ON COLUMN mir_comunicaciones.tipo IS 'Tipo de comunicación: PV (Parte Viajero), RH (Reserva Hospedaje), etc.';
COMMENT ON COLUMN mir_comunicaciones.estado IS 'Estado: pendiente, enviado, confirmado, error, anulado';
COMMENT ON COLUMN mir_comunicaciones.lote IS 'Número de lote asignado por el MIR';
COMMENT ON COLUMN mir_comunicaciones.resultado IS 'Resultado de la comunicación en formato JSON';
COMMENT ON COLUMN mir_comunicaciones.error IS 'Mensaje de error si la comunicación falló';
COMMENT ON COLUMN mir_comunicaciones.xml_enviado IS 'XML enviado al MIR';
COMMENT ON COLUMN mir_comunicaciones.xml_respuesta IS 'XML de respuesta del MIR';

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla mir_comunicaciones actualizada exitosamente' as resultado;
SELECT COUNT(*) as total_tablas FROM information_schema.tables WHERE table_name = 'mir_comunicaciones';
