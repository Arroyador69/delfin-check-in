import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import {
  runDailyPublicOwnerLeads,
  syncOutreachEngagementFromTracking,
} from '@/lib/public-owner-leads/daily-run';
import { PUBLIC_OWNER_SIGNUPS_DAILY_GOAL } from '@/lib/public-owner-leads/constants';

export const maxDuration = 300;

/**
 * Cron ~15:00 Europe/Madrid (invierno CET: vercel `0 14 * * *`).
 * Solo si altas hoy < 20 → hasta 50 emails NUEVOS (nunca reenvío).
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';

  try {
    const engagement = await syncOutreachEngagementFromTracking();
    const outreach = await runDailyPublicOwnerLeads({
      dryRun,
      wave: 'afternoon',
    });

    return NextResponse.json({
      success: true,
      wave: 'afternoon',
      signupGoal: PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
      dryRun,
      engagement,
      outreach,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/public-owner-leads-afternoon]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
