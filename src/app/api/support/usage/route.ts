import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUsage } from '@/lib/support/usage';
import { getTenantById, getPlanConfig } from '@/lib/tenant';
import { defaultLocale, isValidLocale, toIntlDateLocale, type Locale } from '@/i18n/config';

function resolveLocales(req: NextRequest): { pathLocale: Locale; intlLocale: string } {
  const q = req.nextUrl.searchParams.get('locale');
  if (q && isValidLocale(q)) {
    return { pathLocale: q, intlLocale: toIntlDateLocale(q) };
  }
  const header = (req.headers.get('x-locale') || '').trim();
  const short = header.split('-')[0].toLowerCase();
  if (short && isValidLocale(short)) {
    return { pathLocale: short, intlLocale: toIntlDateLocale(short) };
  }
  return { pathLocale: defaultLocale, intlLocale: toIntlDateLocale(defaultLocale) };
}

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

    const { pathLocale, intlLocale } = resolveLocales(req);
    const usage = await getUsage({
      tenantId: payload.tenantId,
      userId: payload.userId,
      planType,
      locale: intlLocale,
    });
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
      upgradePath: `/${pathLocale}/plans`,
    });
  } catch (error: unknown) {
    console.error('[support/usage] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
