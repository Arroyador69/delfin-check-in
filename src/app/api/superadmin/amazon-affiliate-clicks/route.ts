import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import { ensureAuditTable } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseDays(raw: string | null): number {
  const n = parseInt(raw || '30', 10);
  if (Number.isNaN(n)) return 30;
  return Math.min(90, Math.max(1, n));
}

export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const payload = verifyToken(authToken);
    if (!isEffectiveSuperAdminPayload(payload)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const days = parseDays(req.nextUrl.searchParams.get('days'));
    const sinceIso = new Date(Date.now() - days * 86400000).toISOString();

    await ensureAuditTable();

    const summary = await sql`
      SELECT
        COUNT(*)::int AS total_all_time,
        COUNT(*) FILTER (WHERE at >= ${sinceIso}::timestamptz)::int AS total_in_range,
        COUNT(*) FILTER (WHERE at >= ${sinceIso}::timestamptz AND tenant_id IS NOT NULL)::int AS clicks_logged_in,
        COUNT(*) FILTER (WHERE at >= ${sinceIso}::timestamptz AND tenant_id IS NULL)::int AS clicks_anonymous,
        COUNT(DISTINCT tenant_id) FILTER (WHERE at >= ${sinceIso}::timestamptz AND tenant_id IS NOT NULL)::int AS unique_tenants
      FROM audit_log
      WHERE action = 'AFFILIATE_CLICK'
    `;

    const byPlacement = await sql`
      SELECT COALESCE(meta->>'placement', 'unknown') AS placement, COUNT(*)::int AS cnt
      FROM audit_log
      WHERE action = 'AFFILIATE_CLICK' AND at >= ${sinceIso}::timestamptz
      GROUP BY 1
      ORDER BY cnt DESC
    `;

    const byDay = await sql`
      SELECT (date_trunc('day', at AT TIME ZONE 'UTC'))::date AS day, COUNT(*)::int AS cnt
      FROM audit_log
      WHERE action = 'AFFILIATE_CLICK' AND at >= ${sinceIso}::timestamptz
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const topTenants = await sql`
      SELECT al.tenant_id, COUNT(*)::int AS cnt, t.name AS tenant_name, t.email AS tenant_email
      FROM audit_log al
      INNER JOIN tenants t ON t.id = al.tenant_id
      WHERE al.action = 'AFFILIATE_CLICK' AND al.at >= ${sinceIso}::timestamptz
      GROUP BY al.tenant_id, t.name, t.email
      ORDER BY cnt DESC
      LIMIT 25
    `;

    const recent = await sql`
      SELECT al.at, al.tenant_id, al.ip, al.meta, t.name AS tenant_name, t.email AS tenant_email
      FROM audit_log al
      LEFT JOIN tenants t ON t.id = al.tenant_id
      WHERE al.action = 'AFFILIATE_CLICK'
      ORDER BY al.at DESC
      LIMIT 200
    `;

    const s = summary.rows[0] as {
      total_all_time: number;
      total_in_range: number;
      clicks_logged_in: number;
      clicks_anonymous: number;
      unique_tenants: number;
    };

    return NextResponse.json({
      success: true,
      days,
      since: sinceIso,
      summary: {
        totalAllTime: s.total_all_time,
        totalInRange: s.total_in_range,
        clicksLoggedIn: s.clicks_logged_in,
        clicksAnonymous: s.clicks_anonymous,
        uniqueTenants: s.unique_tenants,
      },
      byPlacement: (byPlacement.rows as { placement: string; cnt: number }[]).map((r) => ({
        placement: r.placement,
        count: r.cnt,
      })),
      byDay: (byDay.rows as { day: Date | string; cnt: number }[]).map((r) => {
        const d = r.day instanceof Date ? r.day : new Date(r.day);
        const iso = Number.isNaN(d.getTime()) ? String(r.day) : d.toISOString().slice(0, 10);
        return { day: iso, count: r.cnt };
      }),
      topTenants: (topTenants.rows as {
        tenant_id: string;
        cnt: number;
        tenant_name: string | null;
        tenant_email: string | null;
      }[]).map((r) => ({
        tenantId: r.tenant_id,
        clicks: r.cnt,
        name: r.tenant_name,
        email: r.tenant_email,
      })),
      recent: (recent.rows as {
        at: Date;
        tenant_id: string | null;
        ip: string | null;
        meta: Record<string, unknown> | null;
        tenant_name: string | null;
        tenant_email: string | null;
      }[]).map((r) => ({
        at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
        tenantId: r.tenant_id,
        ip: r.ip,
        placement: (r.meta?.placement as string) || null,
        asin: (r.meta?.asin as string) || null,
        tenantName: r.tenant_name,
        tenantEmail: r.tenant_email,
      })),
    });
  } catch (error) {
    console.error('[superadmin/amazon-affiliate-clicks]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno',
      },
      { status: 500 }
    );
  }
}
