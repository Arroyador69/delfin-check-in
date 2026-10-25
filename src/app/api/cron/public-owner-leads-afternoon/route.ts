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

  if (!process.env.PUBLIC_OWNER_LEADS_FLOW) {
    process.env.PUBLIC_OWNER_LEADS_FLOW = 'A+B';
  }

  try {
    let engagement: unknown = { updated: 0 };
    try {
      engagement = await syncOutreachEngagementFromTracking();
    } catch (e) {
      engagement = { error: e instanceof Error ? e.message : String(e) };
    }

    // Tarde: A+B + más scrape; OSM con deadline corto para no comerse los 300s
    const outreach = await runDailyPublicOwnerLeads({
      dryRun,
      wave: 'afternoon',
      maxSend: 50,
      extractLimit: 22,
    });

    return NextResponse.json({
      success: true,
      wave: 'afternoon',
      flow: process.env.PUBLIC_OWNER_LEADS_FLOW || 'A+B',
      signupGoal: PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
      dryRun,
      engagement,
      outreach,
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
