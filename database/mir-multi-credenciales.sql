-- Migración: Multi-credenciales MIR por unidad (room_id)
-- Objetivo: permitir varias credenciales MIR por tenant y asignarlas por unidad.
-- Tablas:
-- - mir_credenciales: almacena credenciales MIR por tenant
-- - mir_unidades: clasifica cada room_id como habitacion/apartamento
-- - mir_unidad_credencial_map: asigna credencial a room_id (1:1)

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mir_credenciales_tenant_id ON mir_credenciales(tenant_id);

CREATE TABLE IF NOT EXISTS mir_unidades (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  room_id TEXT NOT NULL,
  unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('habitacion', 'apartamento')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_mir_unidades_tenant_id ON mir_unidades(tenant_id);

CREATE TABLE IF NOT EXISTS mir_unidad_credencial_map (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  room_id TEXT NOT NULL,
  credencial_id INT NOT NULL REFERENCES mir_credenciales(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_mir_unidad_credencial_map_tenant_id ON mir_unidad_credencial_map(tenant_id);

