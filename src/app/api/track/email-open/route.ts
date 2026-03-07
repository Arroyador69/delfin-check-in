/**
 * Pixel de apertura de email (tracking).
 * GET /api/track/email-open?tid=UUID
 * Devuelve un 1x1 transparente y registra opened en email_tracking.
 */
import { NextRequest, NextResponse } from 'next/server'
import { updateEmailTracking } from '@/lib/tracking'

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(req: NextRequest) {
  const tid = req.nextUrl.searchParams.get('tid')
  if (!tid) {
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  }

  await updateEmailTracking({
    emailId: tid,
    status: 'opened',
  })

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
