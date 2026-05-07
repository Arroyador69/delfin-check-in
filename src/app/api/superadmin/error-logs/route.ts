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
 * - hide_resolved=1 (default): oculta firmas marcadas como resueltas
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
    const hideResolved = !searchParams.has('hide_resolved') || parseBool(searchParams.get('hide_resolved'));
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
        WITH base AS (
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
            created_at,
            id
          FROM error_logs
          WHERE ${where.join(' AND ')}
        )
        SELECT
          b.signature,
          b.level,
          b.message,
          b.error_name,
          b.url,
          COUNT(*)::int AS count,
          MAX(b.created_at) AS last_seen,
          MIN(b.id) AS sample_id,
          (r.signature IS NOT NULL) AS is_resolved,
          r.resolved_at
        FROM base b
        LEFT JOIN error_log_resolutions r
          ON r.signature = b.signature
        ${hideResolved ? 'WHERE r.signature IS NULL' : ''}
        GROUP BY b.signature, b.level, b.message, b.error_name, b.url, r.signature, r.resolved_at
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
          is_resolved: Boolean(r.is_resolved),
          resolved_at: r.resolved_at?.toISOString?.() ?? (r.resolved_at ? String(r.resolved_at) : null),
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

type ResolveBody = {
  signature?: string;
  resolved?: boolean; // default true
  note?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    await ensureErrorLogTable();

    const body = (await req.json().catch(() => ({}))) as ResolveBody;
    const signature = String(body?.signature || '').trim();
    const resolved = body?.resolved !== false;
    const note = body?.note != null ? String(body.note).slice(0, 500) : null;

    if (!/^[a-f0-9]{32}$/i.test(signature)) {
      return NextResponse.json({ error: 'signature inválida' }, { status: 400 });
    }

    const userId = (payload as any)?.userId || (payload as any)?.id || null;

    if (resolved) {
      await sql`
        INSERT INTO error_log_resolutions (signature, resolved_at, resolved_by, note)
        VALUES (${signature}, now(), ${userId || null}::uuid, ${note})
        ON CONFLICT (signature)
        DO UPDATE SET resolved_at = now(), resolved_by = EXCLUDED.resolved_by, note = EXCLUDED.note
      `;
    } else {
      await sql`DELETE FROM error_log_resolutions WHERE signature = ${signature}`;
    }

    return NextResponse.json({ success: true, signature, resolved });
  } catch (e: any) {
    console.error('[superadmin/error-logs:POST]', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

