import { NextRequest, NextResponse } from 'next/server';
import {
  decodeUnsubscribeEmail,
  recordUnsubscribe,
  verifyUnsubscribeSignature,
} from '@/lib/email-sequences/unsubscribe';

/**
 * Baja one-click (legacy /api/email/unsubscribe). GET redirige a /es/baja-emails.
 */
export async function GET(req: NextRequest) {
  const encoded = req.nextUrl.searchParams.get('e') || '';
  const signature = req.nextUrl.searchParams.get('s') || '';
  const base = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
  const target = new URL(`${base}/es/baja-emails`);
  if (encoded) target.searchParams.set('e', encoded);
  if (signature) target.searchParams.set('s', signature);
  return NextResponse.redirect(target, 302);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const encoded = String(body.e || '');
    const signature = String(body.s || '');
    const email = decodeUnsubscribeEmail(encoded);

    if (!email || !verifyUnsubscribeSignature(email, signature)) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });
    }

    await recordUnsubscribe(email, body.reason ? String(body.reason) : 'api_post');
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
