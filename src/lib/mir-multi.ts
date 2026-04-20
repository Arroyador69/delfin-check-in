import { sql } from '@vercel/postgres';

export type MirUnitType = 'habitacion' | 'apartamento';

export interface MirCredencial {
  id: number;
  tenant_id: string;
  nombre: string;
  usuario: string;
  contraseña: string;
  codigo_arrendador: string;
  codigo_establecimiento: string;
  base_url: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function ensureMirMultiSchema(): Promise<void> {
  // Best-effort: si el schema aún no existe en Neon, lo creamos en runtime.
  // Mantiene compatibilidad con despliegues sin migración aplicada.
  try {
    await sql`
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
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_mir_credenciales_tenant_id ON mir_credenciales(tenant_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS mir_unidades (
        id SERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL,
        room_id TEXT NOT NULL,
        unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('habitacion', 'apartamento')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE (tenant_id, room_id)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_mir_unidades_tenant_id ON mir_unidades(tenant_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS mir_unidad_credencial_map (
        id SERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL,
        room_id TEXT NOT NULL,
        credencial_id INT NOT NULL REFERENCES mir_credenciales(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE (tenant_id, room_id)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_mir_unidad_credencial_map_tenant_id ON mir_unidad_credencial_map(tenant_id)`;
  } catch {
    // Ignorar: en algunas instalaciones el usuario de BD no permite DDL.
  }
}

export async function getMirCredencialesForTenant(tenantId: string): Promise<MirCredencial[]> {
  await ensureMirMultiSchema();
  const res = await sql`
    SELECT *
    FROM mir_credenciales
    WHERE tenant_id = ${tenantId}::uuid
    ORDER BY created_at ASC, id ASC
  `;
  return res.rows as any;
}

export async function getMirUnitTypeMap(tenantId: string): Promise<Map<string, MirUnitType>> {
  await ensureMirMultiSchema();
  const res = await sql`
    SELECT room_id, unit_type
    FROM mir_unidades
    WHERE tenant_id = ${tenantId}::uuid
  `;
  const m = new Map<string, MirUnitType>();
  for (const r of res.rows) {
    m.set(String(r.room_id), String(r.unit_type) as MirUnitType);
  }
  return m;
}

export async function upsertMirUnitType(tenantId: string, roomId: string, unitType: MirUnitType): Promise<void> {
  await ensureMirMultiSchema();
  await sql`
    INSERT INTO mir_unidades (tenant_id, room_id, unit_type, created_at, updated_at)
    VALUES (${tenantId}::uuid, ${roomId}, ${unitType}, NOW(), NOW())
    ON CONFLICT (tenant_id, room_id)
    DO UPDATE SET unit_type = EXCLUDED.unit_type, updated_at = NOW()
  `;
}

export async function getMirUnitCredentialMap(tenantId: string): Promise<Map<string, number>> {
  await ensureMirMultiSchema();
  const res = await sql`
    SELECT room_id, credencial_id
    FROM mir_unidad_credencial_map
    WHERE tenant_id = ${tenantId}::uuid
  `;
  const m = new Map<string, number>();
  for (const r of res.rows) {
    m.set(String(r.room_id), Number(r.credencial_id));
  }
  return m;
}

export async function assignCredentialToRoom(tenantId: string, roomId: string, credencialId: number): Promise<void> {
  await ensureMirMultiSchema();
  await sql`
    INSERT INTO mir_unidad_credencial_map (tenant_id, room_id, credencial_id, created_at, updated_at)
    VALUES (${tenantId}::uuid, ${roomId}, ${credencialId}, NOW(), NOW())
    ON CONFLICT (tenant_id, room_id)
    DO UPDATE SET credencial_id = EXCLUDED.credencial_id, updated_at = NOW()
  `;
}

export async function countDistinctConfiguredCredentials(tenantId: string): Promise<number> {
  await ensureMirMultiSchema();
  const res = await sql`
    SELECT COUNT(*)::int AS n
    FROM mir_credenciales
    WHERE tenant_id = ${tenantId}::uuid
      AND activo = true
  `;
  return Number(res.rows?.[0]?.n ?? 0);
}

