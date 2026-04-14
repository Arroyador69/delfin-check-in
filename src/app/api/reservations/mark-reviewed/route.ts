import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import { getTenantById } from '@/lib/tenant';
import { hasCheckinInstructionsEmailPlan } from '@/lib/checkin-email-plan';
import { ensureReservationCheckinEmailColumns } from '@/lib/reservation-checkin-email-db';
import {
  fetchCheckinInstructionsBodyForRoom,
  sendPmsReservationCheckinInstructionsEmail,
} from '@/lib/pms-checkin-instructions-send';
import { normalizeGuestMailLocale } from '@/lib/pms-guest-checkin-email-i18n';
import { randomUUID } from 'crypto';

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
      RETURNING id, needs_review, guest_name, guest_email, guest_count, room_id, check_in, check_out,
                checkin_instructions_sent_at, checkin_instructions_opt_in, guest_mail_locale
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    let checkinEmail: { attempted: boolean; sent: boolean; skippedReason?: string } = {
      attempted: false,
      sent: false,
    };

    // Intentar enviar instrucciones automáticamente al confirmar (si está permitido y autorizado)
    try {
      await ensureReservationCheckinEmailColumns();
      const tenant = await getTenantById(tenantId);
      if (tenant && hasCheckinInstructionsEmailPlan(tenant)) {
        const row = result.rows[0] as any;
        const email = String(row.guest_email || '').trim();
        const optIn = row.checkin_instructions_opt_in === true;
        const alreadySent = !!row.checkin_instructions_sent_at;

        if (!optIn) {
          checkinEmail = { attempted: false, sent: false, skippedReason: 'opt_in_required' };
        } else if (alreadySent) {
          checkinEmail = { attempted: false, sent: false, skippedReason: 'already_sent' };
        } else if (!email) {
          checkinEmail = { attempted: false, sent: false, skippedReason: 'guest_email_required' };
        } else {
          checkinEmail.attempted = true;

          const token = randomUUID();
          const uiLocale = normalizeGuestMailLocale(row.guest_mail_locale);

          // Recordatorio profesional: no enviar si no hay instrucciones configuradas (por habitación o por defecto)
          const instr = await fetchCheckinInstructionsBodyForRoom(tenantId, String(row.room_id), uiLocale);
          if (!instr?.body_html || !String(instr.body_html).trim()) {
            checkinEmail = { attempted: true, sent: false, skippedReason: 'instructions_not_configured' };
            return;
          }

          const lock = await sql`
            UPDATE reservations
            SET checkin_instructions_track_token = ${token}
            WHERE id = ${reservationId}::uuid
              AND tenant_id = ${tenantId}::uuid
              AND checkin_instructions_sent_at IS NULL
            RETURNING id
          `;
          if (lock.rows.length > 0) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com';
            const trackingUrl = `${baseUrl}/api/public/checkin-email-open?t=${encodeURIComponent(token)}`;

            const sendResult = await sendPmsReservationCheckinInstructionsEmail({
              tenantId,
              tenantName: tenant.name || 'Delfin Check-in',
              guestEmail: email,
              guestName: String(row.guest_name || 'Huésped'),
              checkIn: new Date(row.check_in),
              checkOut: new Date(row.check_out),
              guestCount: Math.max(1, Number(row.guest_count) || 1),
              roomId: String(row.room_id),
              uiLocale,
              trackingPixelUrl: trackingUrl,
            });

            if (sendResult.success) {
              await sql`
                UPDATE reservations
                SET checkin_instructions_sent_at = NOW(), updated_at = NOW()
                WHERE id = ${reservationId}::uuid AND tenant_id = ${tenantId}::uuid
              `;
              checkinEmail = { attempted: true, sent: true };
            } else {
              await sql`
                UPDATE reservations
                SET checkin_instructions_track_token = NULL
                WHERE id = ${reservationId}::uuid AND tenant_id = ${tenantId}::uuid
              `;
              checkinEmail = { attempted: true, sent: false, skippedReason: 'send_failed' };
            }
          } else {
            checkinEmail = { attempted: true, sent: false, skippedReason: 'lock_failed' };
          }
        }
      }
    } catch (e) {
      console.warn('[mark-reviewed] auto-send checkin email:', e);
      // No bloquear la confirmación por error de email
    }

    return NextResponse.json({ success: true, reservation: result.rows[0], checkinEmail });
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
