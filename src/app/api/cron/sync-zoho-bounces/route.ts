import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronOrSuperAdmin } from '@/lib/cron-auth';
import { syncZohoBounces } from '@/lib/zoho-bounce-sync';
import { syncInactiveTenantSuppressions } from '@/lib/email-suppression';

/**
 * Sync bounces Zoho Undelivered → email_unsubscribes (reason=bounce)
 * + escaneo de tenants cancelados/inactivos → reason=tenant_inactive
 *
 * POST /api/cron/sync-zoho-bounces
 * Auth: Authorization Bearer CRON_SECRET o sesión SuperAdmin
 */
export async function POST(req: NextRequest) {
  const { error, via } = await authorizeCronOrSuperAdmin(req);
  if (error) return error;

  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 100;
  const skipTenants = req.nextUrl.searchParams.get('skipTenants') === '1';

  try {
    const zoho = await syncZohoBounces({
      limit: Number.isFinite(limit) ? limit : 100,
    });

    const tenants = skipTenants
      ? { scanned: 0, suppressed: 0, skipped: true as const }
      : await syncInactiveTenantSuppressions();

    return NextResponse.json({
      success: zoho.ok || tenants.suppressed > 0,
      via,
      zoho,
      tenants,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron/sync-zoho-bounces]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/** GET también (Vercel Cron suele usar GET). */
export async function GET(req: NextRequest) {
  return POST(req);
}
