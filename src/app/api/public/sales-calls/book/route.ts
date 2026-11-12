import { NextRequest } from 'next/server';
import { bookSalesCall } from '@/lib/sales-calls/bookings';
import {
  jsonWithSalesCallCors,
  salesCallOptions,
} from '@/lib/sales-calls/cors';
import { formatSlotMadrid } from '@/lib/sales-calls/slots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return salesCallOptions(req);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const result = await bookSalesCall({
      startAt: String(body.startAt || ''),
      name: String(body.name || ''),
      email: String(body.email || ''),
      phone: body.phone ? String(body.phone) : undefined,
      comments: body.comments ? String(body.comments) : undefined,
      source: body.source ? String(body.source) : undefined,
    });

    if (!result.ok) {
      return jsonWithSalesCallCors(
        req,
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const fmt = formatSlotMadrid(new Date(result.startAt));
    return jsonWithSalesCallCors(req, {
      success: true,
      booking: {
        id: result.id,
        startAt: result.startAt,
        endAt: result.endAt,
        meetingUrl: result.meetingUrl,
        dateLabel: fmt.dateLabel,
        timeLabel: fmt.timeLabel,
      },
    });
  } catch (e) {
    console.error('[sales-calls/book]', e);
    return jsonWithSalesCallCors(
      req,
      { success: false, error: 'No se pudo completar la reserva' },
      { status: 500 }
    );
  }
}
