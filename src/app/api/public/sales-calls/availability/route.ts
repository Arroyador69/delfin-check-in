import { NextResponse } from 'next/server';
import { listAvailableSlots } from '@/lib/sales-calls/bookings';
import {
  SALES_CALL_DURATION_MIN,
  SALES_CALL_SLOT_STEP_MIN,
} from '@/lib/sales-calls/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const days = await listAvailableSlots({ days: 14 });
    return NextResponse.json({
      success: true,
      durationMinutes: SALES_CALL_DURATION_MIN,
      slotStepMinutes: SALES_CALL_SLOT_STEP_MIN,
      timezone: 'Europe/Madrid',
      windows: 'L–V 09:00–14:00 y 16:00–19:00',
      note: 'La llamada es puntual (15 min). Entre huecos hay 30 min.',
      days,
    });
  } catch (e) {
    console.error('[sales-calls/availability]', e);
    return NextResponse.json(
      { success: false, error: 'No se pudo cargar el calendario' },
      { status: 500 }
    );
  }
}
