import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { sendEmail } from '@/lib/email';
import {
  parseReputationGoogleFromConfig,
  buildGoogleReviewReminderContent,
  type ReputationGuestLocale,
} from '@/lib/reputation-google';

/**
 * Envía un único recordatorio de reseña en Google por reserva directa
 * (después del día de checkout), solo tenants Pro con función activada.
 *
 * Vercel Cron: Bearer CRON_SECRET (igual que otros crons).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = { scanned: 0, sent: 0, failed: 0, skipped: 0, errors: [] as string[] };

  try {
    const rows = await sql`
      SELECT
        dr.id AS reservation_id,
        dr.guest_email,
        dr.guest_name,
        dr.tenant_id,
        tp.property_name,
        t.name AS tenant_name,
        t.config
      FROM direct_reservations dr
      INNER JOIN tenants t ON t.id = dr.tenant_id::uuid
      INNER JOIN tenant_properties tp ON tp.id = dr.property_id
      WHERE dr.reservation_status = 'confirmed'
        AND dr.payment_status = 'paid'
        AND dr.check_out_date < CURRENT_DATE
        AND dr.google_review_reminder_sent_at IS NULL
        AND (t.plan_type = 'pro' OR t.plan_id IN ('pro', 'enterprise'))
        AND COALESCE(t.config->'reputationGoogle'->>'enabled', 'false') = 'true'
        AND NULLIF(BTRIM(t.config->'reputationGoogle'->>'reviewUrl'), '') IS NOT NULL
      ORDER BY dr.check_out_date ASC
      LIMIT 50
    `;

    results.scanned = rows.rows.length;

    for (const row of rows.rows) {
      const cfg = parseReputationGoogleFromConfig(row.config as Record<string, unknown>);
      const reviewUrl = cfg.reviewUrl.trim();
      const locale = (cfg.guestEmailLocale === 'en' ? 'en' : 'es') as ReputationGuestLocale;
      const guestEmail = String(row.guest_email || '').trim().toLowerCase();

      if (!guestEmail || !guestEmail.includes('@')) {
        results.skipped += 1;
        continue;
      }

      const guestMessage = locale === 'en' ? cfg.guestMessageEn : cfg.guestMessageEs;

      const { subject, html, text } = buildGoogleReviewReminderContent({
        guestName: String(row.guest_name || '').trim() || (locale === 'en' ? 'Guest' : 'Huésped'),
        propertyName: String(row.property_name || '').trim(),
        reviewUrl,
        locale,
        tenantBrandName: String(row.tenant_name || '').trim() || 'Delfín Check-in',
        guestMessage: guestMessage.trim() ? guestMessage : null,
      });

      const send = await sendEmail({
        to: guestEmail,
        subject,
        html,
        text,
      });

      if (!send.success) {
        results.failed += 1;
        results.errors.push(`reservation ${row.reservation_id}: ${send.error || 'send failed'}`);
        continue;
      }

      try {
        await sql`
          UPDATE direct_reservations
          SET google_review_reminder_sent_at = NOW(),
              updated_at = NOW()
          WHERE id = ${row.reservation_id}
            AND google_review_reminder_sent_at IS NULL
        `;
        results.sent += 1;
      } catch (updErr) {
        results.failed += 1;
        const msg = updErr instanceof Error ? updErr.message : String(updErr);
        results.errors.push(`reservation ${row.reservation_id} update: ${msg}`);
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron google-review-reminders]', e);
    if (msg.includes('google_review_reminder_sent_at') || msg.includes('does not exist')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Falta la columna google_review_reminder_sent_at. Ejecuta database/add-google-review-reminder-column.sql en Neon.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
