import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import {
  runDailyPublicOwnerLeads,
  syncOutreachEngagementFromTracking,
} from '@/lib/public-owner-leads/daily-run';
import { syncZohoBounces } from '@/lib/zoho-bounce-sync';
import { syncInactiveTenantSuppressions } from '@/lib/email-suppression';

/**
 * Cron ~09:00 Europe/Madrid (07:00 UTC en CEST):
 * 1) refresca suppression Zoho (si hay credenciales)
 * 2) sincroniza opens/clicks
 * 3) descubre emails de URLs pendientes + envía hasta 50 prueba gratis
 *
 * Auth: Authorization Bearer CRON_SECRET
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const max = parseInt(req.nextUrl.searchParams.get('max') || '50', 10);
  const skipZoho = req.nextUrl.searchParams.get('skipZoho') === '1';

  try {
    let zoho: unknown = null;
    let tenants: unknown = null;
    if (!skipZoho && !dryRun) {
      try {
        zoho = await syncZohoBounces({ limit: 80 });
        tenants = await syncInactiveTenantSuppressions();
      } catch (e) {
        zoho = { error: e instanceof Error ? e.message : String(e) };
      }
    }

    const engagement = await syncOutreachEngagementFromTracking();
    const outreach = await runDailyPublicOwnerLeads({
      dryRun,
      wave: 'morning',
      maxSend: Number.isFinite(max) ? max : 50,
    });

    return NextResponse.json({
      success: true,
      wave: 'morning',
      dryRun,
      zoho,
      tenants,
      engagement,
      outreach,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/public-owner-leads]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
