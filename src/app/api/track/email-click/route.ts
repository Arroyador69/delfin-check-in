/**
 * Redirect de clic en email (tracking).
 * GET /api/track/email-click?tid=UUID&url=ENCODED_URL
 * Registra clicked y redirige a url.
 */
import { NextRequest, NextResponse } from 'next/server'
import { updateEmailTracking } from '@/lib/tracking'

export async function GET(req: NextRequest) {
  const tid = req.nextUrl.searchParams.get('tid')
  const urlParam = req.nextUrl.searchParams.get('url')

  if (tid) {
    await updateEmailTracking({
      emailId: tid,
      status: 'clicked',
      clickUrl: urlParam || undefined,
    })
  }

  const redirectUrl =
    urlParam && /^https?:\/\//i.test(urlParam)
      ? decodeURIComponent(urlParam)
      : 'https://delfincheckin.com/encuesta'

  return NextResponse.redirect(redirectUrl, 302)
}
