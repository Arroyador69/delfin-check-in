import { sql } from '@vercel/postgres';
import { normalizeRoomId } from '@/lib/db';
import { getTransport } from '@/lib/mailer';
import {
  buildPmsCheckinInstructionsEmail,
  normalizeGuestMailLocale,
  type GuestMailLocale,
} from '@/lib/pms-guest-checkin-email-i18n';

export async function fetchCheckinInstructionsBodyForRoom(
  tenantId: string,
  roomId: string | null | undefined
): Promise<{ body_html: string; title: string | null } | null> {
  const attempts = new Set<string>();
  if (roomId) {
    attempts.add(String(roomId));
    attempts.add(normalizeRoomId(roomId));
  }
  for (const rid of attempts) {
    const r = await sql`
      SELECT body_html, title FROM checkin_instructions
      WHERE tenant_id = ${tenantId}::uuid AND room_id = ${rid}::text
      LIMIT 1
    `;
    if (r.rows[0]) return r.rows[0] as { body_html: string; title: string | null };
  }
  const def = await sql`
    SELECT body_html, title FROM checkin_instructions
    WHERE tenant_id = ${tenantId}::uuid AND room_id IS NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return (def.rows[0] as { body_html: string; title: string | null }) || null;
}

function applyInstructionPlaceholders(
  bodyHtml: string,
  vars: { guest_name: string; check_in: string; check_out: string }
): string {
  let out = bodyHtml;
  const map: Record<string, string> = {
    '{{guest_name}}': vars.guest_name,
    '{{check_in_date}}': vars.check_in,
    '{{check_out_date}}': vars.check_out,
  };
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v);
  }
  return out;
}

export async function sendPmsReservationCheckinInstructionsEmail(params: {
  tenantId: string;
  tenantName: string;
  guestEmail: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  roomId: string;
  uiLocale: string | null | undefined;
  trackingPixelUrl?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const row = await fetchCheckinInstructionsBodyForRoom(params.tenantId, params.roomId);
    const ci = params.checkIn.toLocaleDateString('es-ES');
    const co = params.checkOut.toLocaleDateString('es-ES');
    let bodyHtml =
      row?.body_html ||
      '<p>Te enviaremos los detalles del check-in en breve.</p>';
    bodyHtml = applyInstructionPlaceholders(bodyHtml, {
      guest_name: params.guestName,
      check_in: ci,
      check_out: co,
    });

    let contactEmail = 'booking@delfincheckin.com';
    let contactPhone = '';
    let contactName = params.tenantName || 'Delfin Check-in';
    try {
      const cfg = await sql`
        SELECT email, telefono, nombre_empresa FROM empresa_config
        WHERE tenant_id = ${params.tenantId}
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      `;
      if (cfg.rows.length > 0) {
        contactEmail = cfg.rows[0].email || contactEmail;
        contactPhone = cfg.rows[0].telefono || '';
        contactName = cfg.rows[0].nombre_empresa || contactName;
      }
    } catch {
      /* ignore */
    }

    const loc = normalizeGuestMailLocale(params.uiLocale);
    const publicFormUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com'}/api/public/form-redirect/${params.tenantId}`;

    const content = buildPmsCheckinInstructionsEmail({
      locale: loc,
      guestName: params.guestName,
      propertyLabel: params.tenantName,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      guestCount: params.guestCount,
      instructionsHtml: bodyHtml,
      publicFormUrl,
      contactEmail,
      contactPhone,
      contactName,
      trackingPixelUrl: params.trackingPixelUrl,
    });

    const transporter = getTransport();
    const result = await transporter.sendMail({
      from:
        process.env.SMTP_FROM_BOOKING ||
        process.env.SMTP_FROM ||
        'Delfín Check-in <booking@delfincheckin.com>',
      to: params.guestEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    return { success: true, messageId: result.messageId };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    console.error('❌ [PMS check-in email]', msg);
    return { success: false, error: msg };
  }
}

export type { GuestMailLocale };
