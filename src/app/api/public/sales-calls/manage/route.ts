import { NextRequest } from 'next/server';
import {
  cancelSalesCallByToken,
  getBookingByManageToken,
} from '@/lib/sales-calls/bookings';
import { salesCallBookingUrl } from '@/lib/sales-calls/constants';
import {
  jsonWithSalesCallCors,
  salesCallOptions,
} from '@/lib/sales-calls/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return salesCallOptions(req);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const booking = await getBookingByManageToken(token);
  if (!booking) {
    return jsonWithSalesCallCors(
      req,
      { success: false, error: 'Reserva no encontrada.' },
      { status: 404 }
    );
  }
  return jsonWithSalesCallCors(req, {
    success: true,
    booking: {
      status: booking.status,
      name: booking.name,
      email: booking.email,
      dateLabel: booking.dateLabel,
      timeLabel: booking.timeLabel,
      meetingUrl: booking.meetingUrl,
      startAt: booking.startAt,
      rescheduleUrl: salesCallBookingUrl({
        email: booking.email,
        source: 'reschedule',
      }),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const token = String(body.token || '');
  const action = String(body.action || 'cancel');
  if (action !== 'cancel') {
    return jsonWithSalesCallCors(
      req,
      { success: false, error: 'Acción no válida.' },
      { status: 400 }
    );
  }
  const result = await cancelSalesCallByToken(token);
  if (!result.ok) {
    return jsonWithSalesCallCors(
      req,
      { success: false, error: result.error },
      { status: 400 }
    );
  }
  return jsonWithSalesCallCors(req, {
    success: true,
    booking: {
      status: 'cancelled',
      dateLabel: result.booking.dateLabel,
      timeLabel: result.booking.timeLabel,
      email: result.booking.email,
      rescheduleUrl: salesCallBookingUrl({
        email: result.booking.email,
        source: 'reschedule',
      }),
    },
  });
}
