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
      return NextResponse.json({ count: 0 });
    }

    const result = await sql`
      SELECT COUNT(*)::int AS c
      FROM reservations
      WHERE tenant_id = ${tenantId}::uuid
        AND COALESCE(needs_review, false) = true
    `.catch(() => ({ rows: [{ c: 0 }] }));

    const count = result.rows[0]?.c ?? 0;
    return NextResponse.json({ count: Number(count) });
  } catch (e) {
    console.error('[pending-reservations-review]', e);
    return NextResponse.json({ count: 0 });
  }
}
