import { NextRequest, NextResponse } from 'next/server';
import { processUnsubscribeRequest } from '@/lib/email-sequences/unsubscribe-page';

/**
 * Baja RGPD con URL legible (/es/baja-emails) en lugar de /api/email/unsubscribe.
 */
export async function GET(req: NextRequest) {
  const encoded = req.nextUrl.searchParams.get('e') || '';
  const signature = req.nextUrl.searchParams.get('s') || '';
  const result = await processUnsubscribeRequest(encoded, signature);

  return new NextResponse(result.html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
