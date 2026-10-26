import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import { runPublicOwnerLeadsWaveCron } from '@/lib/public-owner-leads/run-wave-cron';
import { PUBLIC_OWNER_LEADS_WAVE_MAX } from '@/lib/public-owner-leads/constants';
import { syncZohoBounces } from '@/lib/zoho-bounce-sync';
import { syncInactiveTenantSuppressions } from '@/lib/email-suppression';

export const maxDuration = 300;

/**
 * Compat: antigua oleada “mañana”. Preferir `/api/cron/public-owner-leads-wave`.
 * Fuerza franja morning · máx 50.
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const skipZoho = req.nextUrl.searchParams.get('skipZoho') === '1';

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

  const result = await runPublicOwnerLeadsWaveCron({
    dryRun,
    force: true,
    wave: 'morning',
    maxSend: PUBLIC_OWNER_LEADS_WAVE_MAX,
  });

  return NextResponse.json({ ...result, zoho, tenants, legacy: 'morning' }, { status: 200 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
