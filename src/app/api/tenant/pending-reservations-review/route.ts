import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

/**
 * Cuenta reservas marcadas para revisión (origen formulario de huéspedes).
 * Disponible para todos los planes (badge en navegación).
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ count: 0, items: [] });
    }

    const [countRow, listRows] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS c
        FROM reservations
        WHERE tenant_id = ${tenantId}::uuid
          AND COALESCE(needs_review, false) = true
      `.catch(() => ({ rows: [{ c: 0 }] })),
      sql`
        SELECT id::text AS id,
               COALESCE(NULLIF(TRIM(guest_name), ''), '—') AS guest_name,
               check_in
        FROM reservations
        WHERE tenant_id = ${tenantId}::uuid
          AND COALESCE(needs_review, false) = true
        ORDER BY check_in ASC NULLS LAST, created_at DESC
        LIMIT 15
      `.catch(() => ({ rows: [] as { id: string; guest_name: string; check_in: string | null }[] })),
    ]);

    const count = countRow.rows[0]?.c ?? 0;
    const items = (listRows.rows || []).map((row) => ({
      id: row.id,
      guest_name: row.guest_name,
      check_in: row.check_in ? new Date(row.check_in).toISOString() : null,
    }));

    return NextResponse.json({ count: Number(count), items });
  } catch (e) {
    console.error('[pending-reservations-review]', e);
    return NextResponse.json({ count: 0, items: [] });
  }
}
