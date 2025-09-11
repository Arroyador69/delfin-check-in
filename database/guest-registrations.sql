-- Tabla simple para almacenar registros de viajeros del formulario público
-- Compatible con el endpoint /api/registro-flex

CREATE TABLE IF NOT EXISTS guest_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reserva_ref VARCHAR(50),
  fecha_entrada DATE NOT NULL,
  fecha_salida DATE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_guest_registrations_fecha_entrada ON guest_registrations(fecha_entrada);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_fecha_salida ON guest_registrations(fecha_salida);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_created_at ON guest_registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_reserva_ref ON guest_registrations(reserva_ref);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_guest_registrations_updated_at 
  BEFORE UPDATE ON guest_registrations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();