/**
 * 🔧 Error Logger
 * 
 * Sistema para guardar errores en la base de datos para el superadmin
 */

import { sql } from '@/lib/db'

export interface ErrorLog {
  id: string
  level: 'error' | 'warning' | 'info'
  message: string
  tenant_id?: string | null
  user_id?: string | null
  error_stack?: string | null
  error_name?: string | null
  url?: string | null
  metadata?: Record<string, any> | null
  created_at: string
}

/**
 * Asegurar que la tabla existe
 */
let tableEnsured = false

export async function ensureErrorLogTable(): Promise<void> {
  if (tableEnsured) return

  await sql`
    CREATE TABLE IF NOT EXISTS error_logs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      level TEXT NOT NULL CHECK (level IN ('error', 'warning', 'info')),
      message TEXT NOT NULL,
      tenant_id UUID,
      user_id UUID,
      error_stack TEXT,
      error_name TEXT,
      url TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `

  // Índices para búsquedas rápidas
  await sql`
    CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_error_logs_tenant ON error_logs(tenant_id);
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
  `

  tableEnsured = true
}

/**
 * Guardar un error en la base de datos
 */
export async function logError(entry: {
  level: 'error' | 'warning' | 'info'
  message: string
  error?: Error | unknown
  tenantId?: string | null
  userId?: string | null
  url?: string | null
  metadata?: Record<string, any>
}): Promise<void> {
  try {
    await ensureErrorLogTable()

    let errorStack: string | null = null
    let errorName: string | null = null

    if (entry.error instanceof Error) {
      errorStack = entry.error.stack || null
      errorName = entry.error.name || null
    } else if (entry.error) {
      errorStack = String(entry.error)
      errorName = 'UnknownError'
    }

    await sql`
      INSERT INTO error_logs (
        level,
        message,
        tenant_id,
        user_id,
        error_stack,
        error_name,
        url,
        metadata
      )
      VALUES (
        ${entry.level},
        ${entry.message},
        ${entry.tenantId || null},
        ${entry.userId || null},
        ${errorStack},
        ${errorName},
        ${entry.url || null},
        ${entry.metadata ? JSON.stringify(entry.metadata) : null}::jsonb
      )
    `
  } catch (err) {
    // No lanzar error si falla el logging para no crear bucles
    console.error('Error guardando log:', err)
  }
}

/**
 * Obtener errores de la base de datos
 */
export async function getErrorLogs(options: {
  level?: 'error' | 'warning' | 'info' | 'all'
  tenantId?: string
  limit?: number
  offset?: number
  from?: Date
  to?: Date
}): Promise<ErrorLog[]> {
  await ensureErrorLogTable()

  const limit = Math.min(options.limit || 100, 500)
  const offset = options.offset || 0

  let query = sql`
    SELECT 
      id,
      level,
      message,
      tenant_id,
      user_id,
      error_stack,
      error_name,
      url,
      metadata,
      created_at
    FROM error_logs
    WHERE 1=1
  `

  if (options.level && options.level !== 'all') {
    query = sql`
      ${query}
      AND level = ${options.level}
    `
  }

  if (options.tenantId) {
    query = sql`
      ${query}
      AND tenant_id = ${options.tenantId}
    `
  }

  if (options.from) {
    query = sql`
      ${query}
      AND created_at >= ${options.from.toISOString()}
    `
  }

  if (options.to) {
    query = sql`
      ${query}
      AND created_at <= ${options.to.toISOString()}
    `
  }

  query = sql`
    ${query}
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `

  const result = await query

  return result.rows.map((row) => ({
    id: row.id,
    level: row.level as 'error' | 'warning' | 'info',
    message: row.message,
    tenant_id: row.tenant_id || undefined,
    user_id: row.user_id || undefined,
    error_stack: row.error_stack || undefined,
    error_name: row.error_name || undefined,
    url: row.url || undefined,
    metadata: row.metadata || undefined,
    created_at: row.created_at.toISOString(),
  }))
}

/**
 * Obtener estadísticas de errores
 */
export async function getErrorStats(): Promise<{
  total: number
  errors: number
  warnings: number
  last24h: number
}> {
  await ensureErrorLogTable()

  const [totalResult, errorsResult, warningsResult, last24hResult] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM error_logs`,
    sql`SELECT COUNT(*) as count FROM error_logs WHERE level = 'error'`,
    sql`SELECT COUNT(*) as count FROM error_logs WHERE level = 'warning'`,
    sql`SELECT COUNT(*) as count FROM error_logs WHERE created_at >= now() - INTERVAL '24 hours'`,
  ])

  return {
    total: parseInt(totalResult.rows[0]?.count || '0'),
    errors: parseInt(errorsResult.rows[0]?.count || '0'),
    warnings: parseInt(warningsResult.rows[0]?.count || '0'),
    last24h: parseInt(last24hResult.rows[0]?.count || '0'),
  }
}

