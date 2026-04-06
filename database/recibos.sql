-- Recibos de pago (acreditación de cobro). También se crean automáticamente al usar la API (/api/recibos) vía ensureFacturasTables.

CREATE TABLE IF NOT EXISTS recibos (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  numero_recibo VARCHAR(50) NOT NULL,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_nif VARCHAR(20),
  cliente_direccion TEXT,
  cliente_codigo_postal VARCHAR(10),
  cliente_ciudad VARCHAR(100),
  cliente_provincia VARCHAR(100),
  cliente_pais VARCHAR(100) DEFAULT 'España',
  concepto VARCHAR(500) NOT NULL,
  descripcion TEXT,
  fecha_pago DATE,
  fecha_estancia_desde DATE,
  fecha_estancia_hasta DATE,
  importe_total DECIMAL(10,2) NOT NULL,
  incluir_iva BOOLEAN DEFAULT FALSE,
  iva_porcentaje DECIMAL(5,2) DEFAULT 0,
  base_imponible DECIMAL(10,2) DEFAULT 0,
  iva_importe DECIMAL(10,2) DEFAULT 0,
  forma_pago VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, numero_recibo)
);

CREATE INDEX IF NOT EXISTS idx_recibos_tenant_id ON recibos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recibos_fecha_emision ON recibos(fecha_emision);
