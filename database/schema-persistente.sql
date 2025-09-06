-- Esquema de base de datos para persistencia real de registros de viajeros
-- Ejecutar en Vercel Postgres o tu base de datos Postgres

CREATE TABLE IF NOT EXISTS guest_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_ref TEXT,                -- referencia opcional del usuario
  fecha_entrada DATE NOT NULL,
  fecha_salida  DATE NOT NULL,
  data JSONB NOT NULL,             -- todo el payload original completo
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_guest_created_at ON guest_registrations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_fecha_entrada ON guest_registrations (fecha_entrada);
CREATE INDEX IF NOT EXISTS idx_guest_fecha_salida ON guest_registrations (fecha_salida);
CREATE INDEX IF NOT EXISTS idx_guest_reserva_ref ON guest_registrations (reserva_ref);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_guest_registrations_updated_at ON guest_registrations;
CREATE TRIGGER update_guest_registrations_updated_at
    BEFORE UPDATE ON guest_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE guest_registrations IS 'Registros de viajeros con persistencia real';
COMMENT ON COLUMN guest_registrations.id IS 'Identificador único del registro';
COMMENT ON COLUMN guest_registrations.reserva_ref IS 'Referencia opcional del usuario';
COMMENT ON COLUMN guest_registrations.fecha_entrada IS 'Fecha de entrada del viajero';
COMMENT ON COLUMN guest_registrations.fecha_salida IS 'Fecha de salida del viajero';
COMMENT ON COLUMN guest_registrations.data IS 'Datos completos del registro en formato JSON';
COMMENT ON COLUMN guest_registrations.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN guest_registrations.updated_at IS 'Fecha de última actualización';
