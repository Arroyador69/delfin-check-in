import { NextRequest, NextResponse } from 'next/server';
import { associateTenantWithReferrer, getReferrerFromCookie } from '@/lib/referrals';
import { parseReferralCookie } from '@/lib/referral-tracking';
import { sql } from '@/lib/db';

/**
 * POST /api/referrals/associate
 * Endpoint para asociar un nuevo tenant con su referente durante el registro/onboarding
 * 
 * Body: { tenant_id: string, plan_type?: 'free' | 'checkin' | 'pro' }
 * 
 * O también puede leer la cookie de referido desde el request
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenant_id, plan_type = 'free' } = body;

    if (!tenant_id) {
      return NextResponse.json(
        { success: false, error: 'tenant_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el tenant existe
    const tenantCheck = await sql`
      SELECT id, referred_by 
      FROM tenants 
      WHERE id = ${tenant_id}
      LIMIT 1
    `;

    if (tenantCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    // Si ya está asociado, no hacer nada
    if (tenantCheck.rows[0].referred_by) {
      return NextResponse.json({
        success: true,
        message: 'Tenant ya está asociado a un referente',
        alreadyAssociated: true,
      });
    }

    // Intentar obtener el referente desde la cookie
    const cookieHeader = req.headers.get('cookie');
    let referrerTenantId: string | null = null;
    let referralCodeUsed: string | null = null;

    if (cookieHeader) {
      const cookieMatch = cookieHeader.match(/referral_ref=([^;]+)/);
      if (cookieMatch) {
        try {
          const cookieData = JSON.parse(decodeURIComponent(cookieMatch[1]));
          referralCodeUsed = cookieData.code;
          
          // Obtener el tenant_id del referente desde el código
          referrerTenantId = await getReferrerFromCookie(cookieData);
        } catch (e) {
          console.warn('Error parseando cookie de referido:', e);
        }
      }
    }

    // Si no hay referente desde la cookie, buscar en el body
    if (!referrerTenantId && body.referrer_tenant_id) {
      referrerTenantId = body.referrer_tenant_id;
      referralCodeUsed = body.referral_code || 'UNKNOWN';
    }

    if (!referrerTenantId || !referralCodeUsed) {
      // No hay referente, esto es normal (no todos los usuarios vienen de referidos)
      return NextResponse.json({
        success: true,
        message: 'No se encontró referente en la cookie',
        associated: false,
      });
    }

    // Verificar que el referente no es el mismo tenant
    if (referrerTenantId === tenant_id) {
      return NextResponse.json({
        success: false,
        error: 'Un tenant no puede referirse a sí mismo',
      }, { status: 400 });
    }

    // Asociar el tenant con su referente
    const result = await associateTenantWithReferrer(
      tenant_id,
      referrerTenantId,
      referralCodeUsed,
      plan_type as 'free' | 'checkin' | 'pro'
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tenant asociado con referente exitosamente',
      referralId: result.referralId,
      associated: true,
    });
  } catch (error: any) {
    console.error('Error en associate referral:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
