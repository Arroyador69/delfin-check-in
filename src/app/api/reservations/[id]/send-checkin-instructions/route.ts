import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantById } from '@/lib/tenant';
import { hasCheckinInstructionsEmailPlan } from '@/lib/checkin-email-plan';
import { ensureReservationCheckinEmailColumns } from '@/lib/reservation-checkin-email-db';
import { sendPmsReservationCheckinInstructionsEmail } from '@/lib/pms-checkin-instructions-send';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: reservationId } = await params;
    const tenantId = request.headers.get('x-tenant-id');

    if (!reservationId) {
      return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });
    }
    if (!tenantId || tenantId === 'default' || !tenantId.trim()) {
      return NextResponse.json({ error: 'No se pudo identificar el tenant' }, { status: 401 });
    }

    const { requireActiveTenant } = await import('@/lib/payment-middleware');
    const paymentCheck = await requireActiveTenant(request, tenantId);
    if (paymentCheck) {
      return NextResponse.json(
        { error: paymentCheck.error, code: paymentCheck.code },
        { status: paymentCheck.status }
      );
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant || !hasCheckinInstructionsEmailPlan(tenant)) {
      return NextResponse.json(
        {
          error:
            'El envío de instrucciones de check-in por email está incluido en los planes Standard y Pro.',
          code: 'PLAN_REQUIRED',
        },
        { status: 403 }
      );
    }

    await ensureReservationCheckinEmailColumns();

    const res = await sql`
      SELECT id, guest_name, guest_email, guest_count, room_id, check_in, check_out,
             checkin_instructions_sent_at, tenant_id
      FROM reservations
      WHERE id = ${reservationId}::uuid AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const row = res.rows[0] as {
      guest_name: string;
      guest_email: string | null;
      guest_count: number | null;
      room_id: string;
      check_in: Date;
      check_out: Date;
      checkin_instructions_sent_at: Date | null;
    };

    if (row.checkin_instructions_sent_at) {
      return NextResponse.json(
        { error: 'Ya se enviaron las instrucciones de check-in a esta reserva.', code: 'ALREADY_SENT' },
        { status: 400 }
      );
    }

    const email = String(row.guest_email || '').trim();
    if (!email) {
      return NextResponse.json(
        {
          error:
            'Añade el email del huésped en la reserva para poder enviar las instrucciones de check-in.',
          code: 'GUEST_EMAIL_REQUIRED',
        },
        { status: 400 }
      );
    }

    const token = randomUUID();
    const lock = await sql`
      UPDATE reservations
      SET checkin_instructions_track_token = ${token}
      WHERE id = ${reservationId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND checkin_instructions_sent_at IS NULL
      RETURNING id
    `;

    if (lock.rows.length === 0) {
      return NextResponse.json(
        { error: 'No se pudo preparar el envío. Inténtalo de nuevo.', code: 'LOCK_FAILED' },
        { status: 409 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com';
    const trackingUrl = `${baseUrl}/api/public/checkin-email-open?t=${encodeURIComponent(token)}`;

    const uiLocale =
      request.headers.get('x-ui-locale') ||
      request.headers.get('X-UI-Locale') ||
      request.headers.get('accept-language')?.split(',')[0]?.trim();

    const tenantName = tenant.name || 'Delfin Check-in';
    const sendResult = await sendPmsReservationCheckinInstructionsEmail({
      tenantId,
      tenantName,
      guestEmail: email,
      guestName: row.guest_name,
      checkIn: new Date(row.check_in),
      checkOut: new Date(row.check_out),
      guestCount: Math.max(1, Number(row.guest_count) || 1),
      roomId: String(row.room_id),
      uiLocale,
      trackingPixelUrl: trackingUrl,
    });

    if (!sendResult.success) {
      await sql`
        UPDATE reservations
        SET checkin_instructions_track_token = NULL
        WHERE id = ${reservationId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      return NextResponse.json(
        { error: sendResult.error || 'Error al enviar el email', code: 'SEND_FAILED' },
        { status: 502 }
      );
    }

    await sql`
      UPDATE reservations
      SET checkin_instructions_sent_at = NOW(), updated_at = NOW()
      WHERE id = ${reservationId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      checkin_instructions_sent_at: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    console.error('[send-checkin-instructions]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
