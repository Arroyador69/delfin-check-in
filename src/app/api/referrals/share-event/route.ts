import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { insertReferralShareEvent, type ReferralShareAction } from '@/lib/referral-share-events';

/**
 * POST /api/referrals/share-event
 * Trackea acciones del tenant en la pantalla de referidos (copy/share/facebook).
 */
export async function POST(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    if (!payload?.tenantId) {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '').trim() as ReferralShareAction | '';
    const referralCode = body.referral_code ? String(body.referral_code) : null;
    const page = body.page ? String(body.page) : null;
    const target = body.target ? String(body.target) : null;
    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    if (!action) {
      return NextResponse.json({ success: false, error: 'action es requerido' }, { status: 400 });
    }

    await insertReferralShareEvent({
      tenantId: payload.tenantId,
      referralCode,
      action,
      page,
      target,
      metadata: {
        ...metadata,
        userAgent: req.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error tracking referral share-event:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

