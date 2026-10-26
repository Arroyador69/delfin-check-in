import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import { runPublicOwnerLeadsWaveCron } from '@/lib/public-owner-leads/run-wave-cron';
import { PUBLIC_OWNER_LEADS_WAVE_MAX } from '@/lib/public-owner-leads/constants';
import { waveScheduleSummary } from '@/lib/public-owner-leads/wave-schedule';

export const maxDuration = 300;

/**
 * Oleada Zoho-safe: hasta 50 mails · cada ~30 min · tope día 1000.
 * Vercel: `0,30 7-16 * * *` (CET ≈ 08:00–17:30 Madrid).
 * Para si altas ≥ 20; Telegram cada 150 acumulados.
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const force = req.nextUrl.searchParams.get('force') === '1';
  const maxRaw = parseInt(req.nextUrl.searchParams.get('max') || '', 10);
  const maxSend = Number.isFinite(maxRaw)
    ? Math.min(PUBLIC_OWNER_LEADS_WAVE_MAX, Math.max(1, maxRaw))
    : PUBLIC_OWNER_LEADS_WAVE_MAX;

  const result = await runPublicOwnerLeadsWaveCron({
    dryRun,
    force,
    maxSend,
  });

  return NextResponse.json(
    {
      ...result,
      schedule: waveScheduleSummary(),
      flow: process.env.PUBLIC_OWNER_LEADS_FLOW || 'A+B+C',
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  return GET(req);
}
