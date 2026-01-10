import { NextRequest, NextResponse } from 'next/server';
import { verifyReferralCode, generateCookieId } from '@/lib/referral-tracking';

/**
 * POST /api/referrals/track
 * Endpoint para trackear clicks de referidos desde la landing page
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { referral_code, cookie_id, landing_page } = body;

    if (!referral_code) {
      return NextResponse.json(
        { success: false, error: 'referral_code es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el código de referido existe
    const verification = await verifyReferralCode(referral_code);

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Código de referido inválido' },
        { status: 404 }
      );
    }

    // Usar cookie_id proporcionado o generar uno nuevo
    const cookieId = cookie_id || generateCookieId();

    // Por ahora solo verificamos el código y devolvemos el cookieId
    // La asociación real se hace durante el registro/onboarding
    return NextResponse.json({
      success: true,
      cookieId: cookieId,
      tenantId: verification.tenantId,
    });
  } catch (error: any) {
    console.error('Error en track referral:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/referrals/track/verify
 * Endpoint para verificar si existe una cookie de referido
 */
export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    if (!cookieHeader) {
      return NextResponse.json({ success: false, referral: null });
    }

    // Buscar cookie referral_ref
    const cookieMatch = cookieHeader.match(/referral_ref=([^;]+)/);
    if (!cookieMatch) {
      return NextResponse.json({ success: false, referral: null });
    }

    try {
      const cookieData = JSON.parse(decodeURIComponent(cookieMatch[1]));
      const { code, cookieId } = cookieData;

      // Verificar que el código aún existe
      const verification = await verifyReferralCode(code);

      if (!verification.success) {
        return NextResponse.json({ success: false, referral: null });
      }

      return NextResponse.json({
        success: true,
        referral: {
          code,
          cookieId,
          tenantId: verification.tenantId,
        },
      });
    } catch (e) {
      return NextResponse.json({ success: false, referral: null });
    }
  } catch (error: any) {
    console.error('Error verificando referral cookie:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
