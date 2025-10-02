-- Script para crear la tabla mir_comunicaciones
-- Ejecutar este script en la base de datos de producción

-- Tabla para almacenar comunicaciones al MIR
CREATE TABLE IF NOT EXISTS mir_comunicaciones (
    id SERIAL PRIMARY KEY,
    referencia VARCHAR(255) UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    datos JSONB NOT NULL,
    resultado JSONB,
    estado VARCHAR(50) DEFAULT 'pendiente',
    lote VARCHAR(255),
    error TEXT,
    codigo_establecimiento VARCHAR(20) NOT NULL,
    fecha_entrada TIMESTAMP WITH TIME ZONE,
    fecha_salida TIMESTAMP WITH TIME ZONE,
    num_personas INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_estado ON mir_comunicaciones(estado);
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_timestamp ON mir_comunicaciones(timestamp);
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_lote ON mir_comunicaciones(lote);
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_codigo_establecimiento ON mir_comunicaciones(codigo_establecimiento);
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_fecha_entrada ON mir_comunicaciones(fecha_entrada);

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
COMMENT ON COLUMN mir_comunicaciones.datos IS 'Datos completos de la comunicación en formato JSON';
COMMENT ON COLUMN mir_comunicaciones.resultado IS 'Respuesta del MIR en formato JSON';
COMMENT ON COLUMN mir_comunicaciones.estado IS 'Estado: pendiente, enviado, confirmado, error';
COMMENT ON COLUMN mir_comunicaciones.lote IS 'Número de lote asignado por el MIR';
COMMENT ON COLUMN mir_comunicaciones.error IS 'Mensaje de error si la comunicación falló';

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla mir_comunicaciones creada exitosamente' as resultado;
SELECT COUNT(*) as total_tablas FROM information_schema.tables WHERE table_name = 'mir_comunicaciones';
