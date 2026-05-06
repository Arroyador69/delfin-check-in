import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { ensureErrorLogTable } from '@/lib/error-logger';
import { sql } from '@/lib/db';

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function parseBool(v: string | null): boolean {
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * GET /api/superadmin/error-logs
 * Query:
 * - grouped=1 (default): agrupa por firma (level+message+error_name+url)
 * - level=error|warning|info|all
 * - q=texto (busca en message/url/error_name/error_stack)
 * - hours=24 (últimas N horas)
 * - limit=100 (máx 500)
 * - offset=0 (solo cuando grouped=0)
 */
export async function GET(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    await ensureErrorLogTable();

    const { searchParams } = new URL(req.url);
    const grouped = !searchParams.has('grouped') || parseBool(searchParams.get('grouped'));
    const level = (searchParams.get('level') || 'all').toLowerCase();
    const q = (searchParams.get('q') || '').trim();
    const hoursRaw = Number(searchParams.get('hours') || '');
    const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? Math.min(24 * 30, hoursRaw) : null; // hasta 30 días
    const limit = clampInt(Number(searchParams.get('limit') || 100), 1, 500);
    const offset = clampInt(Number(searchParams.get('offset') || 0), 0, 50_000);

    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (level && level !== 'all') {
      params.push(level);
      where.push(`level = $${params.length}`);
    }

    if (hours != null) {
      params.push(String(hours));
      where.push(`created_at >= now() - ($${params.length}::text || ' hours')::interval`);
    }

    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where.push(
        `(message ILIKE ${p} OR COALESCE(url,'') ILIKE ${p} OR COALESCE(error_name,'') ILIKE ${p} OR COALESCE(error_stack,'') ILIKE ${p})`
      );
    }

    if (grouped) {
      // Firma estable para agrupar: level + error_name + message + url
      const text = `
        SELECT
          md5(
            level || '|' ||
            COALESCE(error_name,'') || '|' ||
            message || '|' ||
            COALESCE(url,'')
          ) AS signature,
          level,
          message,
          COALESCE(error_name,'') AS error_name,
          COALESCE(url,'') AS url,
          COUNT(*)::int AS count,
          MAX(created_at) AS last_seen,
          MIN(id) AS sample_id
        FROM error_logs
        WHERE ${where.join(' AND ')}
        GROUP BY signature, level, message, error_name, url
        ORDER BY last_seen DESC
        LIMIT ${limit}
      `;

      const result = await (sql as any).query(text, params);
      return NextResponse.json({
        success: true,
        grouped: true,
        items: (result.rows as any[]).map((r) => ({
          signature: r.signature,
          level: r.level,
          message: r.message,
          error_name: r.error_name || null,
          url: r.url || null,
          count: Number(r.count || 0),
          last_seen: r.last_seen?.toISOString?.() ?? String(r.last_seen),
          sample_id: r.sample_id,
        })),
      });
    }

    params.push(limit);
    params.push(offset);
    const text = `
      SELECT
        id, level, message, tenant_id, user_id, error_stack, error_name, url, metadata, created_at
      FROM error_logs
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const result = await (sql as any).query(text, params);
    return NextResponse.json({
      success: true,
      grouped: false,
      items: (result.rows as any[]).map((row) => ({
        ...row,
        created_at: row.created_at?.toISOString?.() ?? String(row.created_at),
      })),
    });
  } catch (e: any) {
    console.error('[superadmin/error-logs]', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

