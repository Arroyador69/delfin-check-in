import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantFromRequest } from '@/lib/permissions';

/**
 * GET /api/referrals/list
 * Obtiene la lista de referidos para el tenant autenticado
 */
export async function GET(req: NextRequest) {
  try {
    const tenantData = await getTenantFromRequest(req);
    if (!tenantData) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    const tenantId = tenantData.tenantId;

    // Obtener lista de referidos
    const referrals = await sql`
      SELECT 
        r.id,
        r.status,
        r.referred_plan_type as plan_type,
        r.registered_at,
        r.first_paid_at,
        r.last_paid_at,
        r.months_paid_completed,
        t.name as referred_name,
        t.email as referred_email
      FROM referrals r
      INNER JOIN tenants t ON t.id = r.referred_tenant_id
      WHERE r.referrer_tenant_id = ${tenantId}
      ORDER BY r.created_at DESC
    `;

    const referralsList = referrals.rows.map(r => ({
      id: r.id,
      referredName: r.referred_name || 'Sin nombre',
      referredEmail: r.referred_email,
      status: r.status,
      planType: r.referred_plan_type || 'free',
      registeredAt: r.registered_at,
      firstPaidAt: r.first_paid_at,
      lastPaidAt: r.last_paid_at,
      monthsPaidCompleted: r.months_paid_completed || 0,
    }));

    return NextResponse.json({
      success: true,
      data: referralsList,
    });
  } catch (error: any) {
    console.error('Error obteniendo lista de referidos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
