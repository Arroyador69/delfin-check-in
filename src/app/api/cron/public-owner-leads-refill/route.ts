import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import { sql } from '@/lib/db';
import { PUBLIC_OWNER_LEADS_MIN_QUEUED } from '@/lib/public-owner-leads/constants';
import { refillQueuedStock } from '@/lib/public-owner-leads/refill-queue';

export const maxDuration = 120;

/**
 * Keep-alive cola cold: SOLO refill light (extract pending).
 * Cada hora en jornada para que NUNCA quede queued=0 a media tarde.
 * vercel: `15 7-19 * * *`
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const force = req.nextUrl.searchParams.get('force') === '1';

  const q = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'queued' AND opted_out = false
  `;
  const queued = Number(q.rows[0]?.n || 0);

  if (!force && queued >= PUBLIC_OWNER_LEADS_MIN_QUEUED) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'queue_ok',
      queued,
      target: PUBLIC_OWNER_LEADS_MIN_QUEUED,
    });
  }

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      queued,
      wouldRefill: queued < PUBLIC_OWNER_LEADS_MIN_QUEUED || force,
      target: PUBLIC_OWNER_LEADS_MIN_QUEUED,
    });
  }

  // Emergency: cola baja → extract más agresivo, sin opendata (anti-timeout)
  const emergency = queued < 150;
  const refill = await refillQueuedStock({
    target: PUBLIC_OWNER_LEADS_MIN_QUEUED,
    extractLimit: emergency ? 120 : 80,
    opendataLimit: 0,
    light: true,
    alertIfStarved: true,
    starveBelow: 80,
  });

  return NextResponse.json({
    success: true,
    wave: 'refill-light',
    queuedBefore: queued,
    refill,
    target: PUBLIC_OWNER_LEADS_MIN_QUEUED,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
