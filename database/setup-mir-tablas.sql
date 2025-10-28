-- ========================================
-- CONFIGURACIÓN TABLAS MIR PARA NEON DATABASE
-- ========================================
-- Este script configura SOLO las tablas MIR necesarias
-- respetando las tablas existentes en tu base de datos

-- ========================================
-- TABLA: mir_comunicaciones
-- ========================================
-- Almacena las comunicaciones enviadas al MIR
CREATE TABLE IF NOT EXISTS mir_comunicaciones (
    id SERIAL PRIMARY KEY,
    referencia VARCHAR(255) UNIQUE NOT NULL,
    tipo VARCHAR(10) DEFAULT 'PV' CHECK (tipo IN ('PV', 'RH', 'AV', 'RV')),
    estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'confirmado', 'error', 'anulado')),
    lote VARCHAR(255),
    resultado TEXT,
    error TEXT,
    xml_enviado TEXT,
    xml_respuesta TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLA: mir_configuraciones
-- ========================================
-- Configuraciones MIR para sistema multitenant
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

-- ========================================
-- VERIFICAR TABLA: guest_registrations
-- ========================================
-- Esta tabla ya debería existir, pero la verificamos
CREATE TABLE IF NOT EXISTS guest_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reserva_ref VARCHAR(255),
    fecha_entrada DATE NOT NULL,
    fecha_salida DATE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ========================================

-- Índices para mir_comunicaciones
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_estado ON mir_comunicaciones(estado);
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_referencia ON mir_comunicaciones(referencia);
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_lote ON mir_comunicaciones(lote);
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_created_at ON mir_comunicaciones(created_at);
CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_tipo ON mir_comunicaciones(tipo);

-- Índices para mir_configuraciones
CREATE INDEX IF NOT EXISTS idx_mir_configuraciones_propietario_id ON mir_configuraciones(propietario_id);
CREATE INDEX IF NOT EXISTS idx_mir_configuraciones_activo ON mir_configuraciones(activo);

-- Índices para guest_registrations (si no existen)
CREATE INDEX IF NOT EXISTS idx_guest_registrations_fecha_entrada ON guest_registrations(fecha_entrada);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_created_at ON guest_registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_reserva_ref ON guest_registrations(reserva_ref);

-- ========================================
-- FUNCIONES Y TRIGGERS
-- ========================================

-- Función para actualizar updated_at en mir_comunicaciones
CREATE OR REPLACE FUNCTION update_mir_comunicaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para mir_comunicaciones
DROP TRIGGER IF EXISTS update_mir_comunicaciones_updated_at ON mir_comunicaciones;
CREATE TRIGGER update_mir_comunicaciones_updated_at
    BEFORE UPDATE ON mir_comunicaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_mir_comunicaciones_updated_at();

-- Función para actualizar updated_at en mir_configuraciones
CREATE OR REPLACE FUNCTION update_mir_configuraciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para mir_configuraciones
DROP TRIGGER IF EXISTS update_mir_configuraciones_updated_at ON mir_configuraciones;
CREATE TRIGGER update_mir_configuraciones_updated_at
    BEFORE UPDATE ON mir_configuraciones
    FOR EACH ROW
    EXECUTE FUNCTION update_mir_configuraciones_updated_at();

-- ========================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ========================================

COMMENT ON TABLE mir_comunicaciones IS 'Almacena las comunicaciones enviadas al Ministerio del Interior';
COMMENT ON COLUMN mir_comunicaciones.referencia IS 'Referencia única de la comunicación';
COMMENT ON COLUMN mir_comunicaciones.tipo IS 'Tipo de comunicación: PV (Parte Viajero), RH (Reserva Hospedaje), AV (Alta Viajero), RV (Reserva Vehículo)';
COMMENT ON COLUMN mir_comunicaciones.estado IS 'Estado: pendiente, enviado, confirmado, error, anulado';
COMMENT ON COLUMN mir_comunicaciones.lote IS 'Número de lote asignado por el MIR';
COMMENT ON COLUMN mir_comunicaciones.resultado IS 'Resultado de la comunicación en formato JSON';
COMMENT ON COLUMN mir_comunicaciones.error IS 'Mensaje de error si la comunicación falló';
COMMENT ON COLUMN mir_comunicaciones.xml_enviado IS 'XML enviado al MIR';
COMMENT ON COLUMN mir_comunicaciones.xml_respuesta IS 'XML de respuesta del MIR';

COMMENT ON TABLE mir_configuraciones IS 'Configuraciones MIR para sistema multitenant';
COMMENT ON COLUMN mir_configuraciones.propietario_id IS 'ID único del propietario/tenant';
COMMENT ON COLUMN mir_configuraciones.usuario IS 'Usuario MIR del propietario';
COMMENT ON COLUMN mir_configuraciones.contraseña IS 'Contraseña MIR del propietario';
COMMENT ON COLUMN mir_configuraciones.codigo_arrendador IS 'Código de arrendador MIR';
COMMENT ON COLUMN mir_configuraciones.base_url IS 'URL del servicio MIR';
COMMENT ON COLUMN mir_configuraciones.aplicacion IS 'Nombre de la aplicación';
COMMENT ON COLUMN mir_configuraciones.simulacion IS 'Modo simulación (true) o producción (false)';
COMMENT ON COLUMN mir_configuraciones.activo IS 'Indica si la configuración está activa';

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

-- Verificar que las tablas se crearon correctamente
SELECT 'Tablas MIR configuradas exitosamente' as resultado;

-- Mostrar información de las tablas creadas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('mir_comunicaciones', 'mir_configuraciones', 'guest_registrations')
ORDER BY table_name, ordinal_position;

-- Mostrar índices creados
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('mir_comunicaciones', 'mir_configuraciones', 'guest_registrations')
ORDER BY tablename, indexname;

-- Mostrar triggers creados
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('mir_comunicaciones', 'mir_configuraciones')
ORDER BY event_object_table, trigger_name;

-- Contar registros en cada tabla
SELECT 
    'mir_comunicaciones' as tabla,
    COUNT(*) as registros
FROM mir_comunicaciones
UNION ALL
SELECT 
    'mir_configuraciones' as tabla,
    COUNT(*) as registros
FROM mir_configuraciones
UNION ALL
SELECT 
    'guest_registrations' as tabla,
    COUNT(*) as registros
FROM guest_registrations;
