-- Tabla para configuraciones MIR por propietario (sistema multitenant)
-- Permite que múltiples propietarios tengan sus propias credenciales MIR

CREATE TABLE IF NOT EXISTS mir_configuraciones (
    id SERIAL PRIMARY KEY,
    propietario_id VARCHAR(255) NOT NULL UNIQUE,
    usuario VARCHAR(255) NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    codigo_arrendador VARCHAR(255) NOT NULL,
    base_url VARCHAR(500) NOT NULL DEFAULT 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
    aplicacion VARCHAR(100) NOT NULL DEFAULT 'Delfin_Check_in',
    simulacion BOOLEAN NOT NULL DEFAULT false,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_mir_configuraciones_propietario_id ON mir_configuraciones(propietario_id);
CREATE INDEX IF NOT EXISTS idx_mir_configuraciones_activo ON mir_configuraciones(activo);

-- Comentarios para documentación
COMMENT ON TABLE mir_configuraciones IS 'Configuraciones MIR por propietario para sistema multitenant';
COMMENT ON COLUMN mir_configuraciones.propietario_id IS 'Identificador único del propietario';
COMMENT ON COLUMN mir_configuraciones.usuario IS 'Usuario MIR del propietario (formato: CIF---WS)';
COMMENT ON COLUMN mir_configuraciones.contraseña IS 'Contraseña MIR del propietario';
COMMENT ON COLUMN mir_configuraciones.codigo_arrendador IS 'Código de arrendador asignado por el MIR';
COMMENT ON COLUMN mir_configuraciones.base_url IS 'URL base del servicio MIR';
COMMENT ON COLUMN mir_configuraciones.aplicacion IS 'Nombre de la aplicación';
COMMENT ON COLUMN mir_configuraciones.simulacion IS 'Indica si está en modo simulación';
COMMENT ON COLUMN mir_configuraciones.activo IS 'Indica si la configuración está activa';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_mir_configuraciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mir_configuraciones_updated_at
    BEFORE UPDATE ON mir_configuraciones
    FOR EACH ROW
    EXECUTE FUNCTION update_mir_configuraciones_updated_at();

-- Datos de ejemplo (opcional - para testing)
-- INSERT INTO mir_configuraciones (
--     propietario_id,
--     usuario,
--     contraseña,
--     codigo_arrendador,
--     base_url,
--     aplicacion,
--     simulacion,
--     activo
-- ) VALUES (
--     'propietario_ejemplo',
--     'EJEMPLO12345678---WS',
--     'contraseña_ejemplo',
--     '0000256653',
--     'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
--     'Delfin_Check_in',
--     true,
--     true
-- );

-- Vista para configuraciones activas (sin contraseñas)
CREATE OR REPLACE VIEW mir_configuraciones_activas AS
SELECT 
    id,
    propietario_id,
    usuario,
    codigo_arrendador,
    base_url,
    aplicacion,
    simulacion,
    activo,
    created_at,
    updated_at
FROM mir_configuraciones
WHERE activo = true;

-- Función para obtener configuración de un propietario
CREATE OR REPLACE FUNCTION get_mir_config(propietario_id_param VARCHAR(255))
RETURNS TABLE (
    id INTEGER,
    propietario_id VARCHAR(255),
    usuario VARCHAR(255),
    contraseña VARCHAR(255),
    codigo_arrendador VARCHAR(255),
    base_url VARCHAR(500),
    aplicacion VARCHAR(100),
    simulacion BOOLEAN,
    activo BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id,
        mc.propietario_id,
        mc.usuario,
        mc.contraseña,
        mc.codigo_arrendador,
        mc.base_url,
        mc.aplicacion,
        mc.simulacion,
        mc.activo,
        mc.created_at,
        mc.updated_at
    FROM mir_configuraciones mc
    WHERE mc.propietario_id = propietario_id_param
    AND mc.activo = true;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un propietario tiene configuración MIR
CREATE OR REPLACE FUNCTION has_mir_config(propietario_id_param VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    config_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO config_count
    FROM mir_configuraciones
    WHERE propietario_id = propietario_id_param
    AND activo = true;
    
    RETURN config_count > 0;
END;
$$ LANGUAGE plpgsql;
