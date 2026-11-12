import { sql } from '@/lib/db';
import { SALES_CALL_PROJECT } from './constants';
import { ensureSalesCallBookingsSchema } from './schema';
import { formatSlotMadrid } from './slots';

export type SalesCallDashboardStats = {
  confirmedUpcoming: number;
  bookedToday: number;
  bookedWeek: number;
  cancelledWeek: number;
  upcoming: Array<{
    id: string;
    name: string;
    email: string;
    source: string | null;
    status: string;
    startAt: string;
    dateLabel: string;
    timeLabel: string;
    comments: string | null;
  }>;
};

export async function fetchSalesCallDashboardStats(): Promise<SalesCallDashboardStats> {
  try {
    await ensureSalesCallBookingsSchema();
  } catch {
    return emptyStats();
  }

  try {
    const summary = await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'confirmed'
            AND project = ${SALES_CALL_PROJECT}
            AND start_at >= NOW()
        )::int AS confirmed_upcoming,
        COUNT(*) FILTER (
          WHERE project = ${SALES_CALL_PROJECT}
            AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
              AT TIME ZONE 'Europe/Madrid'
            AND status = 'confirmed'
        )::int AS booked_today,
        COUNT(*) FILTER (
          WHERE project = ${SALES_CALL_PROJECT}
            AND created_at >= NOW() - INTERVAL '7 days'
            AND status = 'confirmed'
        )::int AS booked_week,
        COUNT(*) FILTER (
          WHERE project = ${SALES_CALL_PROJECT}
            AND updated_at >= NOW() - INTERVAL '7 days'
            AND status = 'cancelled'
        )::int AS cancelled_week
      FROM sales_call_bookings
    `;

    const upcoming = await sql`
      SELECT id::text AS id, name, email, source, status, comments,
        start_at AT TIME ZONE 'UTC' AS start_at
      FROM sales_call_bookings
      WHERE project = ${SALES_CALL_PROJECT}
        AND status = 'confirmed'
        AND start_at >= NOW() - INTERVAL '1 hour'
      ORDER BY start_at ASC
      LIMIT 25
    `;

    const row = summary.rows[0] || {};
    return {
      confirmedUpcoming: Number(row.confirmed_upcoming || 0),
      bookedToday: Number(row.booked_today || 0),
      bookedWeek: Number(row.booked_week || 0),
      cancelledWeek: Number(row.cancelled_week || 0),
      upcoming: upcoming.rows.map((r) => {
        const start = new Date(String(r.start_at));
        const fmt = formatSlotMadrid(start);
        return {
          id: String(r.id),
          name: String(r.name || ''),
          email: String(r.email || ''),
          source: r.source ? String(r.source) : null,
          status: String(r.status || ''),
          startAt: start.toISOString(),
          dateLabel: fmt.dateLabel,
          timeLabel: fmt.timeLabel,
          comments: r.comments ? String(r.comments) : null,
        };
      }),
    };
  } catch (e) {
    console.error('[sales-calls/stats]', e);
    return emptyStats();
  }
}

function emptyStats(): SalesCallDashboardStats {
  return {
    confirmedUpcoming: 0,
    bookedToday: 0,
    bookedWeek: 0,
    cancelledWeek: 0,
    upcoming: [],
  };
}
