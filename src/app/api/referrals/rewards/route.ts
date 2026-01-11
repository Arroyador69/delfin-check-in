import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantFromRequest } from '@/lib/auth';

/**
 * GET /api/referrals/rewards
 * Obtiene el historial de recompensas para el tenant autenticado
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener historial de recompensas
    const rewards = await sql`
      SELECT 
        id,
        reward_type,
        reason,
        months_granted,
        status,
        granted_at,
        applied_at,
        revoked_at,
        created_at
      FROM referral_rewards
      WHERE referrer_tenant_id = ${tenant.id}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      data: rewards.rows.map(row => ({
        id: row.id,
        rewardType: row.reward_type,
        reason: row.reason,
        monthsGranted: parseInt(row.months_granted || '0'),
        status: row.status,
        grantedAt: row.granted_at,
        appliedAt: row.applied_at,
        revokedAt: row.revoked_at,
        createdAt: row.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Error obteniendo historial de recompensas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
