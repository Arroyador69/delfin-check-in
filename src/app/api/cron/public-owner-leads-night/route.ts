import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import { runPublicOwnerLeadsWaveCron } from '@/lib/public-owner-leads/run-wave-cron';
import { PUBLIC_OWNER_LEADS_WAVE_MAX } from '@/lib/public-owner-leads/constants';

export const maxDuration = 300;

/** Compat: franja night · máx 50. Preferir public-owner-leads-wave. */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const result = await runPublicOwnerLeadsWaveCron({
    dryRun,
    force: true,
    wave: 'night',
    maxSend: PUBLIC_OWNER_LEADS_WAVE_MAX,
  });
  return NextResponse.json({ ...result, legacy: 'night' }, { status: 200 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
