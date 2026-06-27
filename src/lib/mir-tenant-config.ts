import { sql } from '@vercel/postgres';
import { ensureMirMultiSchema } from '@/lib/mir-multi';

export interface MirTenantConfig {
  baseUrl: string;
  username: string;
  password: string;
  codigoArrendador: string;
  codigoEstablecimiento: string;
  aplicacion: string;
  simulacion: boolean;
  source: 'mir_credenciales' | 'mir_configuraciones' | 'none';
}

const DEFAULT_BASE_URL =
  'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion';

function rowToConfig(
  row: Record<string, unknown>,
  source: MirTenantConfig['source']
): MirTenantConfig {
  return {
    baseUrl: String(row.base_url || DEFAULT_BASE_URL),
    username: String(row.usuario || '').trim().toUpperCase(),
    password: String(row.contraseña || row.contrasena || ''),
    codigoArrendador: String(row.codigo_arrendador || '').trim(),
    codigoEstablecimiento: String(row.codigo_establecimiento || '').trim(),
    aplicacion: String(row.aplicacion || 'Delfin_Check_in'),
    simulacion: Boolean(row.simulacion),
    source,
  };
}

function isUsableConfig(cfg: MirTenantConfig): boolean {
  return Boolean(cfg.username && cfg.password && cfg.codigoArrendador);
}

/**
 * Resuelve credenciales MIR del tenant: primero mir_credenciales (multi-unidad),
 * luego fallback legacy mir_configuraciones.
 */
export async function resolveMirTenantConfig(
  tenantId: string,
  options?: { roomId?: string | null }
): Promise<MirTenantConfig | null> {
  if (!tenantId || tenantId === 'default') return null;

  await ensureMirMultiSchema();

  const roomId = options?.roomId?.trim() || null;

  if (roomId) {
    try {
      const mapped = await sql`
        SELECT c.usuario, c.contraseña, c.codigo_arrendador, c.codigo_establecimiento, c.base_url, true AS activo
        FROM mir_unidad_credencial_map m
        JOIN mir_credenciales c ON c.id = m.credencial_id
        WHERE m.tenant_id = ${tenantId}::uuid
          AND m.room_id = ${roomId}
          AND c.activo = true
        LIMIT 1
      `;
      if (mapped.rows.length > 0) {
        const cfg = rowToConfig(mapped.rows[0] as Record<string, unknown>, 'mir_credenciales');
        if (isUsableConfig(cfg)) return cfg;
      }
    } catch {
      // seguir con fallback
    }
  }

  try {
    const creds = await sql`
      SELECT usuario, contraseña, codigo_arrendador, codigo_establecimiento, base_url, activo
      FROM mir_credenciales
      WHERE tenant_id = ${tenantId}::uuid AND activo = true
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `;
    if (creds.rows.length > 0) {
      const cfg = rowToConfig(creds.rows[0] as Record<string, unknown>, 'mir_credenciales');
      if (isUsableConfig(cfg)) return cfg;
    }
  } catch {
    // seguir con legacy
  }

  try {
    const legacy = await sql`
      SELECT usuario, contraseña, codigo_arrendador, codigo_establecimiento, base_url, aplicacion, simulacion, activo
      FROM mir_configuraciones
      WHERE propietario_id = ${tenantId} OR tenant_id = ${tenantId}
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const row = legacy.rows[0] as Record<string, unknown> | undefined;
    if (row && row.activo !== false) {
      const cfg = rowToConfig(row, 'mir_configuraciones');
      if (isUsableConfig(cfg)) return cfg;
    }
  } catch {
    // sin credenciales
  }

  return null;
}

/** Mantiene mir_configuraciones sincronizada al crear/actualizar mir_credenciales. */
export async function syncMirConfiguracionesLegacy(
  tenantId: string,
  data: {
    usuario: string;
    contraseña: string;
    codigoArrendador: string;
    codigoEstablecimiento: string;
    baseUrl: string;
    aplicacion?: string;
    simulacion?: boolean;
  }
): Promise<void> {
  const aplicacion = data.aplicacion || 'Delfin_Check_in';
  const simulacion = Boolean(data.simulacion);

  try {
    const updateResult = await sql`
      UPDATE mir_configuraciones
      SET
        usuario = ${data.usuario},
        contraseña = ${data.contraseña},
        codigo_arrendador = ${data.codigoArrendador},
        codigo_establecimiento = ${data.codigoEstablecimiento},
        base_url = ${data.baseUrl},
        aplicacion = ${aplicacion},
        simulacion = ${simulacion},
        activo = true,
        updated_at = NOW()
      WHERE propietario_id = ${tenantId} OR tenant_id = ${tenantId}
    `;

    if ((updateResult.rowCount ?? 0) === 0) {
      await sql`
        INSERT INTO mir_configuraciones (
          propietario_id, usuario, contraseña, codigo_arrendador, codigo_establecimiento,
          base_url, aplicacion, simulacion, activo, created_at, updated_at
        ) VALUES (
          ${tenantId}, ${data.usuario}, ${data.contraseña}, ${data.codigoArrendador}, ${data.codigoEstablecimiento},
          ${data.baseUrl}, ${aplicacion}, ${simulacion}, true, NOW(), NOW()
        )
      `;
    }
  } catch (e) {
    console.warn('⚠️ No se pudo sincronizar mir_configuraciones legacy:', e);
  }
}
