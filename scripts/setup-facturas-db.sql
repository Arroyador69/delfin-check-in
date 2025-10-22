-- Script para crear las tablas de facturas en Neon
-- Ejecutar este script en la consola SQL de Neon

-- Tabla para configuración de datos de empresa/alojamiento
CREATE TABLE IF NOT EXISTS empresa_config (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    nombre_empresa VARCHAR(255) NOT NULL,
    nif_empresa VARCHAR(20) NOT NULL,
    direccion_empresa TEXT NOT NULL,
    codigo_postal VARCHAR(10),
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'España',
    telefono VARCHAR(20),
    email VARCHAR(255),
    web VARCHAR(255),
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id)
);

-- Tabla para facturas emitidas
CREATE TABLE IF NOT EXISTS facturas (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    numero_factura VARCHAR(50) NOT NULL,
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Datos del cliente/huésped
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_nif VARCHAR(20),
    cliente_direccion TEXT,
    cliente_codigo_postal VARCHAR(10),
    cliente_ciudad VARCHAR(100),
    cliente_provincia VARCHAR(100),
    cliente_pais VARCHAR(100) DEFAULT 'España',
    
    -- Concepto del servicio
    concepto VARCHAR(500) NOT NULL,
    descripcion TEXT,
    
    -- Datos económicos
    precio_base DECIMAL(10,2) NOT NULL,
    iva_porcentaje DECIMAL(5,2) DEFAULT 21.00,
    iva_importe DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    
    -- Forma de pago (opcional)
    forma_pago VARCHAR(100),
    
    -- Archivo PDF
    pdf_url VARCHAR(500),
    pdf_filename VARCHAR(255),
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, numero_factura)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_facturas_tenant_id ON facturas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha_emision ON facturas(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero_factura);

-- Función para generar número de factura automático
CREATE OR REPLACE FUNCTION generar_numero_factura(p_tenant_id VARCHAR(255))
RETURNS VARCHAR(50) AS $$
DECLARE
    ultimo_numero INTEGER;
    nuevo_numero VARCHAR(50);
BEGIN
    -- Obtener el último número de factura para este tenant
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura FROM '[0-9]+$') AS INTEGER)), 0)
    INTO ultimo_numero
    FROM facturas 
    WHERE tenant_id = p_tenant_id;
    
    -- Generar nuevo número (año + número correlativo)
    nuevo_numero := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || LPAD((ultimo_numero + 1)::TEXT, 4, '0');
    
    RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_empresa_config_updated_at 
    BEFORE UPDATE ON empresa_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facturas_updated_at 
    BEFORE UPDATE ON facturas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verificar que las tablas se crearon correctamente
SELECT 'empresa_config' as tabla, COUNT(*) as registros FROM empresa_config
UNION ALL
SELECT 'facturas' as tabla, COUNT(*) as registros FROM facturas;
