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
 * Cron ~20:00 Europe/Madrid (invierno CET: vercel `0 19 * * *`).
 * 4ª oleada: si altas hoy < 20 → hasta 50 más (tope día 200).
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
    const provinces = provincesForWave('night', 4);

    const outreach = await runDailyPublicOwnerLeads({
      dryRun,
      wave: 'night',
      maxSend: 250,
      extractLimit: 36,
    });

    let telegram: unknown = null;
    if (!dryRun) {
      telegram = await notifyCaptacionWave({
        wave: 'night',
        waveSent: outreach.sent,
        waveFailed: outreach.failed,
        skippedBecauseGoalMet: Boolean(outreach.skippedBecauseGoalMet),
        extraNote: 'Última oleada del día · tope 1000 si meta 20 altas no cumplida',
      });
    }

    return NextResponse.json({
      success: true,
      wave: 'night',
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
    console.error('[cron/public-owner-leads-night]', msg);
    return NextResponse.json(
      { success: false, wave: 'night', error: msg },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
