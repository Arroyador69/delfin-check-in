import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import {
  runDailyPublicOwnerLeads,
  syncOutreachEngagementFromTracking,
} from '@/lib/public-owner-leads/daily-run';
import { PUBLIC_OWNER_SIGNUPS_DAILY_GOAL } from '@/lib/public-owner-leads/constants';
import { notifyCaptacionWave } from '@/lib/public-owner-leads/captacion-telegram';

export const maxDuration = 300;

/**
 * Cron ~15:00 Europe/Madrid (invierno CET: vercel `0 14 * * *`).
 * 2ª oleada: si altas hoy < 20 → hasta 50 emails NUEVOS (nunca reenvío).
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';

  if (!process.env.PUBLIC_OWNER_LEADS_FLOW) {
    process.env.PUBLIC_OWNER_LEADS_FLOW = 'A+B+C';
  }

  try {
    let engagement: unknown = { updated: 0 };
    try {
      engagement = await syncOutreachEngagementFromTracking();
    } catch (e) {
      engagement = { error: e instanceof Error ? e.message : String(e) };
    }

    const { provincesForWave } = await import('@/lib/public-owner-leads/provinces-es');
    const provinces = provincesForWave('afternoon', 4);

    const outreach = await runDailyPublicOwnerLeads({
      dryRun,
      wave: 'afternoon',
      maxSend: 250,
      extractLimit: 36,
    });

    let telegram: unknown = null;
    if (!dryRun) {
      telegram = await notifyCaptacionWave({
        wave: 'afternoon',
        waveSent: outreach.sent,
        waveFailed: outreach.failed,
        skippedBecauseGoalMet: Boolean(outreach.skippedBecauseGoalMet),
      });
    }

    return NextResponse.json({
      success: true,
      wave: 'afternoon',
      provinces,
      flow: process.env.PUBLIC_OWNER_LEADS_FLOW || 'A+B+C',
      signupGoal: PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
      dryRun,
      engagement,
      outreach,
      telegram,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/public-owner-leads-afternoon]', msg);
    return NextResponse.json(
      { success: false, wave: 'afternoon', error: msg },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
