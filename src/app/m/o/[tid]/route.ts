/**
 * Pixel de apertura (ruta corta, menos sospechosa para antivirus que /api/track/...).
 * GET /m/o/:tid
 */
import { NextRequest, NextResponse } from 'next/server';
import { updateEmailTracking } from '@/lib/tracking';

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ tid: string }> }
) {
  const { tid } = await context.params;
  if (!tid?.trim()) {
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  await updateEmailTracking({
    emailId: tid.trim(),
    status: 'opened',
  });

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
