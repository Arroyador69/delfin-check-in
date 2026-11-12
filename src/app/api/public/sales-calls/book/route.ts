import { NextRequest, NextResponse } from 'next/server';
import { bookSalesCall } from '@/lib/sales-calls/bookings';
import { formatSlotMadrid } from '@/lib/sales-calls/slots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const fmt = formatSlotMadrid(new Date(result.startAt));
    return NextResponse.json({
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
    return NextResponse.json(
      { success: false, error: 'No se pudo completar la reserva' },
      { status: 500 }
    );
  }
}
