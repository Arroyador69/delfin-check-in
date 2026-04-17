import { NextRequest, NextResponse } from 'next/server';
import { getReferralStats, generateReferralCodeForTenant } from '@/lib/referrals';
import { getTenantCredits } from '@/lib/referral-credits';
import { sql } from '@/lib/db';
import { getTenantFromRequest } from '@/lib/permissions';

/**
 * GET /api/referrals/stats
 * Obtiene estadísticas de referidos para el tenant autenticado
 */
export async function GET(req: NextRequest) {
  try {
    const tenantData = await getTenantFromRequest(req);
    if (!tenantData) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    const tenantId = tenantData.tenantId;

    // Obtener código de referido (generar si no existe)
    let referralCode = await sql`
      SELECT referral_code 
      FROM tenants 
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    if (!referralCode.rows[0]?.referral_code) {
      // Generar código si no existe
      await generateReferralCodeForTenant(tenantId);
      referralCode = await sql`
        SELECT referral_code 
        FROM tenants 
        WHERE id = ${tenantId}
        LIMIT 1
      `;
    }

    // Obtener estadísticas de referidos
    const stats = await getReferralStats(tenantId);

    // Obtener créditos acumulados
    const credits = await getTenantCredits(tenantId);

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        referralCode: referralCode.rows[0]?.referral_code || null,
        checkinCredits: credits.checkinCredits,
        proCredits: credits.proCredits,
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo estadísticas de referidos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
