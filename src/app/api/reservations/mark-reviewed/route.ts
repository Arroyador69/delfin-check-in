import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

/**
 * Marca una reserva como revisada por el propietario (quita needs_review).
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no identificado' }, { status: 401 });
    }

    const body = await req.json();
    const reservationId = body.reservationId || body.id;
    if (!reservationId) {
      return NextResponse.json({ error: 'reservationId requerido' }, { status: 400 });
    }

    const result = await sql`
      UPDATE reservations
      SET needs_review = false, updated_at = NOW()
      WHERE id = ${reservationId}::uuid AND tenant_id = ${tenantId}::uuid
      RETURNING id, needs_review
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, reservation: result.rows[0] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('needs_review') || msg.includes('does not exist')) {
      return NextResponse.json(
        {
          error:
            'Falta la columna needs_review en reservations. Ejecuta database/add-reservation-from-guest-form.sql en Neon.',
        },
        { status: 500 }
      );
    }
    console.error('[mark-reviewed]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
