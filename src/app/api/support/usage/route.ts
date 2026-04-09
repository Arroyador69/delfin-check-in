import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUsage } from '@/lib/support/usage';
import { getTenantById, getPlanConfig } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    if (!payload?.tenantId || !payload?.userId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const tenant = await getTenantById(payload.tenantId);
    const planType = tenant ? getPlanConfig(tenant).planType : 'free';
    const eligible = planType === 'checkin' || planType === 'standard' || planType === 'pro';

    const locale = (req.headers.get('x-locale') || 'es-ES').toString();
    const usage = await getUsage({ tenantId: payload.tenantId, userId: payload.userId, planType, locale });
    return NextResponse.json({
      success: true,
      eligible,
      planType,
      usedDaily: usage.usedDaily,
      usedMonthly: usage.usedMonthly,
      limitDaily: usage.limitDaily,
      limitMonthly: usage.limitMonthly,
      remainingDaily: usage.remainingDaily,
      remainingMonthly: usage.remainingMonthly,
      resetLabelDay: usage.resetLabelDay,
      resetLabelMonth: usage.resetLabelMonth,
      upgradePath: `/${locale.split('-')[0]}/plans`,
    });
  } catch (error: unknown) {
    console.error('[support/usage] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
