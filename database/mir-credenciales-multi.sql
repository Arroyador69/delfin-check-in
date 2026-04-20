-- =====================================================
-- MIR: Credenciales múltiples + asignación por unidad
-- =====================================================
-- Objetivo:
-- - Permitir varias credenciales MIR por tenant (máximo = unidades contratadas)
-- - Asignar cada unidad (Room) a una credencial MIR
-- - Guardar tipo por unidad: habitacion | apartamento
--
-- NOTA:
-- - No eliminamos la tabla legacy mir_configuraciones: se mantiene para compatibilidad.
-- - Estas tablas nuevas conviven y serán preferidas por el código nuevo.

-- Tabla: credenciales MIR por tenant (1..N)
CREATE TABLE IF NOT EXISTS mir_credenciales (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  nombre VARCHAR(120) NOT NULL DEFAULT 'Credencial MIR',
  usuario VARCHAR(255) NOT NULL,
  contraseña VARCHAR(255) NOT NULL,
  codigo_arrendador VARCHAR(255) NOT NULL,
  codigo_establecimiento VARCHAR(255) NOT NULL,
  base_url VARCHAR(500) NOT NULL DEFAULT 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mir_credenciales_tenant_id ON mir_credenciales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mir_credenciales_activo ON mir_credenciales(activo);

-- Tabla: tipo por unidad (Room) para soportar mixto
CREATE TABLE IF NOT EXISTS mir_unidades (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  room_id TEXT NOT NULL,
  unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('habitacion', 'apartamento')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_mir_unidades_tenant_id ON mir_unidades(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mir_unidades_room_id ON mir_unidades(room_id);

-- Tabla: asignación Room -> credencial MIR
CREATE TABLE IF NOT EXISTS mir_unidad_credencial_map (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  room_id TEXT NOT NULL,
  credencial_id INT NOT NULL REFERENCES mir_credenciales(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_mir_unidad_credencial_map_tenant_id ON mir_unidad_credencial_map(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mir_unidad_credencial_map_credencial_id ON mir_unidad_credencial_map(credencial_id);

-- Triggers updated_at
CREATE OR REPLACE FUNCTION update_updated_at_mir_multi()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_mir_credenciales_updated_at ON mir_credenciales;
CREATE TRIGGER trg_mir_credenciales_updated_at
  BEFORE UPDATE ON mir_credenciales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_mir_multi();

DROP TRIGGER IF EXISTS trg_mir_unidades_updated_at ON mir_unidades;
CREATE TRIGGER trg_mir_unidades_updated_at
  BEFORE UPDATE ON mir_unidades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_mir_multi();

DROP TRIGGER IF EXISTS trg_mir_unidad_credencial_map_updated_at ON mir_unidad_credencial_map;
CREATE TRIGGER trg_mir_unidad_credencial_map_updated_at
  BEFORE UPDATE ON mir_unidad_credencial_map
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_mir_multi();

