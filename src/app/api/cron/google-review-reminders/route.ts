import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { sendEmail } from '@/lib/email';
import {
  parseReputationGoogleFromConfig,
  buildGoogleReviewReminderContent,
  type ReputationGuestLocale,
} from '@/lib/reputation-google';

type ReminderRow = {
  reservation_id: string;
  source_kind: string;
  guest_email: string | null;
  guest_name: string | null;
  property_name: string | null;
  property_review_url: string | null;
  tenant_name: string | null;
  config: Record<string, unknown>;
};

/**
 * Envía un único recordatorio de reseña en Google por reserva:
 * - Reservas directas (microsite, pagadas y confirmadas)
 * - Reservas del panel (tabla reservations: manual, Airbnb, Booking… no canceladas)
 * Tras el día de checkout; solo tenants Pro con función activada y email de huésped válido.
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
    // Hardening: el enlace por propiedad vive en tenant_properties.google_review_url
    try {
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS google_review_url TEXT`;
    } catch (_) {}

    const rows = await sql`
      WITH combined AS (
        SELECT
          dr.id::text AS reservation_id,
          'direct'::text AS source_kind,
          dr.guest_email,
          dr.guest_name,
          tp.property_name,
          tp.google_review_url AS property_review_url,
          t.name AS tenant_name,
          t.config,
          dr.check_out_date AS sort_date
        FROM direct_reservations dr
        INNER JOIN tenants t ON t.id = dr.tenant_id::uuid
        INNER JOIN tenant_properties tp ON tp.id = dr.property_id
        WHERE dr.reservation_status = 'confirmed'
          AND dr.payment_status = 'paid'
          AND dr.check_out_date < CURRENT_DATE
          AND dr.google_review_reminder_sent_at IS NULL
          AND (t.plan_type = 'pro' OR t.plan_id IN ('pro', 'enterprise'))
          AND COALESCE(t.config->'reputationGoogle'->>'enabled', 'false') = 'true'
          AND (
            NULLIF(BTRIM(tp.google_review_url), '') IS NOT NULL
            OR NULLIF(BTRIM(t.config->'reputationGoogle'->>'reviewUrl'), '') IS NOT NULL
          )

        UNION ALL

        SELECT
          r.id::text AS reservation_id,
          'panel'::text AS source_kind,
          r.guest_email,
          r.guest_name,
          COALESCE(
            NULLIF(BTRIM(tp2.property_name), ''),
            NULLIF(BTRIM(rm.name), ''),
            NULLIF(BTRIM(r.room_id), ''),
            ''
          ) AS property_name,
          tp2.google_review_url AS property_review_url,
          t.name AS tenant_name,
          t.config,
          (r.check_out::date) AS sort_date
        FROM reservations r
        INNER JOIN tenants t ON t.id = r.tenant_id
        LEFT JOIN property_room_map prm ON prm.tenant_id = r.tenant_id AND prm.room_id = r.room_id
        LEFT JOIN tenant_properties tp2 ON tp2.id = prm.property_id AND tp2.tenant_id::uuid = r.tenant_id
        LEFT JOIN "Room" rm ON rm.id::text = r.room_id
        WHERE r.status IS DISTINCT FROM 'cancelled'
          AND COALESCE(r.needs_review, false) = false
          AND r.check_out::date < CURRENT_DATE
          AND r.google_review_reminder_sent_at IS NULL
          AND (t.plan_type = 'pro' OR t.plan_id IN ('pro', 'enterprise'))
          AND COALESCE(t.config->'reputationGoogle'->>'enabled', 'false') = 'true'
          AND (
            NULLIF(BTRIM(tp2.google_review_url), '') IS NOT NULL
            OR NULLIF(BTRIM(t.config->'reputationGoogle'->>'reviewUrl'), '') IS NOT NULL
          )
      )
      SELECT reservation_id, source_kind, guest_email, guest_name, property_name, property_review_url, tenant_name, config
      FROM combined
      ORDER BY sort_date ASC NULLS LAST
      LIMIT 50
    `;

    results.scanned = rows.rows.length;

    for (const row of rows.rows as ReminderRow[]) {
      const cfg = parseReputationGoogleFromConfig(row.config as Record<string, unknown>);
      const reviewUrl = (String(row.property_review_url || '').trim() || cfg.reviewUrl.trim());
      const locale = (cfg.guestEmailLocale === 'en' ? 'en' : 'es') as ReputationGuestLocale;
      const guestEmail = String(row.guest_email || '').trim().toLowerCase();

      if (!reviewUrl) {
        results.skipped += 1;
        continue;
      }

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

      const label = row.source_kind === 'panel' ? 'panel' : 'direct';

      if (!send.success) {
        results.failed += 1;
        results.errors.push(`${label} ${row.reservation_id}: ${send.error || 'send failed'}`);
        continue;
      }

      try {
        if (row.source_kind === 'panel') {
          await sql`
            UPDATE reservations
            SET google_review_reminder_sent_at = NOW(),
                updated_at = NOW()
            WHERE id = ${row.reservation_id}::uuid
              AND google_review_reminder_sent_at IS NULL
          `;
        } else {
          const directId = Number.parseInt(row.reservation_id, 10);
          if (!Number.isFinite(directId)) {
            results.failed += 1;
            results.errors.push(`${label} ${row.reservation_id}: invalid id`);
            continue;
          }
          await sql`
            UPDATE direct_reservations
            SET google_review_reminder_sent_at = NOW(),
                updated_at = NOW()
            WHERE id = ${directId}
              AND google_review_reminder_sent_at IS NULL
          `;
        }
        results.sent += 1;
      } catch (updErr) {
        results.failed += 1;
        const msg = updErr instanceof Error ? updErr.message : String(updErr);
        results.errors.push(`${label} ${row.reservation_id} update: ${msg}`);
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
            'Faltan columnas en la base de datos (recordatorios Google y/o reservas desde formulario). Ejecuta en Neon: database/add-google-review-reminder-column.sql y database/add-reservation-from-guest-form.sql.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
