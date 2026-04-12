import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureReservationCheckinEmailColumns } from '@/lib/reservation-checkin-email-db';

export const dynamic = 'force-dynamic';

/** Pixel 1×1 transparente (GIF) */
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t')?.trim();
  if (token) {
    try {
      await ensureReservationCheckinEmailColumns();
      await sql`
        UPDATE reservations
        SET checkin_instructions_opened_at = COALESCE(checkin_instructions_opened_at, NOW())
        WHERE checkin_instructions_track_token = ${token}::uuid
          AND checkin_instructions_sent_at IS NOT NULL
      `;
    } catch (e) {
      console.warn('[checkin-email-open]', e);
    }
  }

  return new NextResponse(PIXEL_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Content-Length': String(PIXEL_GIF.length),
    },
  });
}
