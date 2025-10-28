-- ========================================
-- TABLA PARA REGISTRAR ACEPTACIÓN DEL DPA
-- ========================================
-- Esta tabla registra la aceptación del Contrato de Encargado del Tratamiento (DPA)
-- por parte de cada tenant/propietario

CREATE TABLE IF NOT EXISTS dpa_aceptaciones (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL UNIQUE,
    version_dpa VARCHAR(50) NOT NULL DEFAULT '1.0',
    aceptado BOOLEAN NOT NULL DEFAULT false,
    fecha_aceptacion TIMESTAMP WITH TIME ZONE,
    ip_aceptacion INET,
    user_agent TEXT,
    datos_empresa_completados BOOLEAN NOT NULL DEFAULT false,
    configuracion_mir_completada BOOLEAN NOT NULL DEFAULT false,
    onboarding_completo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_dpa_aceptaciones_tenant_id ON dpa_aceptaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dpa_aceptaciones_aceptado ON dpa_aceptaciones(aceptado);
CREATE INDEX IF NOT EXISTS idx_dpa_aceptaciones_onboarding_completo ON dpa_aceptaciones(onboarding_completo);

-- Comentarios para documentación
COMMENT ON TABLE dpa_aceptaciones IS 'Registro de aceptación del DPA y estado del onboarding por tenant';
COMMENT ON COLUMN dpa_aceptaciones.tenant_id IS 'Identificador único del tenant/propietario';
COMMENT ON COLUMN dpa_aceptaciones.version_dpa IS 'Versión del DPA aceptado';
COMMENT ON COLUMN dpa_aceptaciones.aceptado IS 'Indica si el DPA ha sido aceptado';
COMMENT ON COLUMN dpa_aceptaciones.fecha_aceptacion IS 'Fecha y hora de aceptación del DPA';
COMMENT ON COLUMN dpa_aceptaciones.ip_aceptacion IS 'IP desde la que se aceptó el DPA';
COMMENT ON COLUMN dpa_aceptaciones.user_agent IS 'User agent del navegador';
COMMENT ON COLUMN dpa_aceptaciones.datos_empresa_completados IS 'Indica si se completaron los datos de empresa';
COMMENT ON COLUMN dpa_aceptaciones.configuracion_mir_completada IS 'Indica si se completó la configuración MIR';
COMMENT ON COLUMN dpa_aceptaciones.onboarding_completo IS 'Indica si todo el onboarding está completo';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_dpa_aceptaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dpa_aceptaciones_updated_at
    BEFORE UPDATE ON dpa_aceptaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_dpa_aceptaciones_updated_at();

-- ========================================
-- ACTUALIZAR TABLA mir_configuraciones
-- ========================================
-- Añadir campos adicionales si no existen

-- Verificar si la columna codigo_establecimiento existe, si no, añadirla
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mir_configuraciones' 
        AND column_name = 'codigo_establecimiento'
    ) THEN
        ALTER TABLE mir_configuraciones 
        ADD COLUMN codigo_establecimiento VARCHAR(255);
    END IF;
END $$;

-- Verificar si la columna tenant_id existe, si no, añadirla
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mir_configuraciones' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE mir_configuraciones 
        ADD COLUMN tenant_id VARCHAR(255);
        
        -- Crear índice para tenant_id
        CREATE INDEX IF NOT EXISTS idx_mir_configuraciones_tenant_id ON mir_configuraciones(tenant_id);
    END IF;
END $$;

-- ========================================
-- ACTUALIZAR TABLA empresa_config
-- ========================================
-- Añadir campos adicionales si no existen

-- Verificar si la columna onboarding_completo existe, si no, añadirla
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresa_config' 
        AND column_name = 'onboarding_completo'
    ) THEN
        ALTER TABLE empresa_config 
        ADD COLUMN onboarding_completo BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Verificar si la columna dpa_aceptado existe, si no, añadirla
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empresa_config' 
        AND column_name = 'dpa_aceptado'
    ) THEN
        ALTER TABLE empresa_config 
        ADD COLUMN dpa_aceptado BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================
-- Mostrar el estado de las tablas creadas/actualizadas

SELECT 
    'dpa_aceptaciones' as tabla,
    COUNT(*) as registros
FROM dpa_aceptaciones
UNION ALL
SELECT 
    'empresa_config' as tabla,
    COUNT(*) as registros
FROM empresa_config
UNION ALL
SELECT 
    'mir_configuraciones' as tabla,
    COUNT(*) as registros
FROM mir_configuraciones;











