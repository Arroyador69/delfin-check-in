import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  let tenantId = await getTenantId(req);
  if (!tenantId || tenantId.trim() === '') {
    tenantId = req.headers.get('x-tenant-id');
  }
  if (!tenantId || tenantId === 'default' || tenantId.trim() === '') return null;
  return tenantId;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const months = parseInt(searchParams.get('months') || '12');

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const startStr = startDate.toISOString().split('T')[0];

    const [
      reservationsResult,
      directResult,
      monthlyRes,
      monthlyDirect,
      channelBreakdown,
      dayOfWeekRes,
      roomPerformance,
    ] = await Promise.all([
      sql`
        SELECT
          COUNT(*) as total_reservations,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COALESCE(SUM(total_price), 0) as total_revenue,
          COALESCE(AVG(total_price), 0) as avg_price,
          COALESCE(AVG(EXTRACT(EPOCH FROM (check_out - check_in)) / 86400), 0) as avg_nights
        FROM reservations
        WHERE tenant_id = ${tenantId}::uuid
          AND check_in >= ${startStr}::timestamp
          AND status != 'cancelled'
      `,
      sql`
        SELECT
          COUNT(*) as total_reservations,
          COALESCE(SUM(subtotal), 0) as total_revenue,
          COALESCE(AVG(base_price / NULLIF(nights, 0)), 0) as avg_price_per_night,
          COALESCE(AVG(nights), 0) as avg_nights
        FROM direct_reservations
        WHERE tenant_id = ${tenantId}
          AND check_in_date >= ${startStr}::date
          AND status NOT IN ('cancelled', 'refunded')
      `.catch(() => ({ rows: [{ total_reservations: 0, total_revenue: 0, avg_price_per_night: 0, avg_nights: 0 }] })),
      sql`
        SELECT
          TO_CHAR(check_in, 'YYYY-MM') as month,
          COUNT(*) as reservations,
          COALESCE(SUM(total_price), 0) as revenue,
          COALESCE(AVG(total_price), 0) as avg_total
        FROM reservations
        WHERE tenant_id = ${tenantId}::uuid
          AND check_in >= ${startStr}::timestamp
          AND status != 'cancelled'
        GROUP BY TO_CHAR(check_in, 'YYYY-MM')
        ORDER BY month ASC
      `,
      sql`
        SELECT
          TO_CHAR(check_in_date, 'YYYY-MM') as month,
          COUNT(*) as reservations,
          COALESCE(SUM(subtotal), 0) as revenue
        FROM direct_reservations
        WHERE tenant_id = ${tenantId}
          AND check_in_date >= ${startStr}::date
          AND status NOT IN ('cancelled', 'refunded')
        GROUP BY TO_CHAR(check_in_date, 'YYYY-MM')
        ORDER BY month ASC
      `.catch(() => ({ rows: [] })),
      sql`
        SELECT
          channel,
          COUNT(*) as count,
          COALESCE(SUM(total_price), 0) as revenue
        FROM reservations
        WHERE tenant_id = ${tenantId}::uuid
          AND check_in >= ${startStr}::timestamp
          AND status != 'cancelled'
        GROUP BY channel
        ORDER BY count DESC
      `,
      sql`
        SELECT
          EXTRACT(DOW FROM check_in) as day_of_week,
          COUNT(*) as count
        FROM reservations
        WHERE tenant_id = ${tenantId}::uuid
          AND check_in >= ${startStr}::timestamp
          AND status != 'cancelled'
        GROUP BY EXTRACT(DOW FROM check_in)
        ORDER BY day_of_week
      `,
      sql`
        SELECT
          r.name as room_name,
          COUNT(res.*) as total_reservations,
          COALESCE(SUM(res.total_price), 0) as total_revenue,
          COALESCE(AVG(res.total_price), 0) as avg_price
        FROM "Room" r
        LEFT JOIN reservations res ON res.room_id = r.id
          AND res.check_in >= ${startStr}::timestamp
          AND res.status != 'cancelled'
        WHERE r.tenant_id = ${tenantId}::uuid
        GROUP BY r.id, r.name
        ORDER BY total_revenue DESC
      `.catch(() => ({ rows: [] })),
    ]);

    const resData = reservationsResult.rows[0];
    const dirData = directResult.rows[0];

    const totalRooms = await sql`
      SELECT COUNT(*) as count FROM "Room" WHERE tenant_id = ${tenantId}::uuid
    `;
    const roomCount = parseInt(totalRooms.rows[0]?.count || '1');

    const totalNights = months * 30;
    const occupiedNights = parseFloat(resData.total_reservations) * parseFloat(resData.avg_nights || '0');
    const occupancyRate = Math.min(100, (occupiedNights / (totalNights * roomCount)) * 100);

    const monthlyData: Record<string, { reservations: number; revenue: number }> = {};
    for (const row of monthlyRes.rows) {
      monthlyData[row.month] = {
        reservations: parseInt(row.reservations),
        revenue: parseFloat(row.revenue),
      };
    }
    for (const row of (monthlyDirect as any).rows || []) {
      if (monthlyData[row.month]) {
        monthlyData[row.month].reservations += parseInt(row.reservations);
        monthlyData[row.month].revenue += parseFloat(row.revenue);
      } else {
        monthlyData[row.month] = {
          reservations: parseInt(row.reservations),
          revenue: parseFloat(row.revenue),
        };
      }
    }

    const sortedMonths = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayOfWeekData = dayOfWeekRes.rows.map(row => ({
      day: dayNames[parseInt(row.day_of_week)],
      dayIndex: parseInt(row.day_of_week),
      count: parseInt(row.count),
    }));

    const channels = channelBreakdown.rows.map(row => ({
      channel: row.channel || 'unknown',
      count: parseInt(row.count),
      revenue: parseFloat(row.revenue),
    }));

    if (parseInt(dirData.total_reservations) > 0) {
      channels.push({
        channel: 'direct',
        count: parseInt(dirData.total_reservations),
        revenue: parseFloat(dirData.total_revenue),
      });
    }

    const totalRevenue = parseFloat(resData.total_revenue) + parseFloat(dirData.total_revenue);
    const totalReservations = parseInt(resData.total_reservations) + parseInt(dirData.total_reservations);

    const avgPricePerNight = totalReservations > 0
      ? totalRevenue / (totalReservations * Math.max(1, parseFloat(resData.avg_nights || '1')))
      : 0;

    return NextResponse.json({
      success: true,
      analysis: {
        summary: {
          totalReservations,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          avgPricePerNight: Math.round(avgPricePerNight * 100) / 100,
          avgNights: Math.round(parseFloat(resData.avg_nights || '0') * 10) / 10,
          occupancyRate: Math.round(occupancyRate * 10) / 10,
          cancelledCount: parseInt(resData.cancelled || '0'),
          roomCount,
        },
        monthly: sortedMonths,
        channels,
        dayOfWeek: dayOfWeekData,
        roomPerformance: roomPerformance.rows.map(r => ({
          roomName: r.room_name,
          reservations: parseInt(r.total_reservations),
          revenue: Math.round(parseFloat(r.total_revenue) * 100) / 100,
          avgPrice: Math.round(parseFloat(r.avg_price) * 100) / 100,
        })),
      },
    });
  } catch (error) {
    console.error('[market/analysis] error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
