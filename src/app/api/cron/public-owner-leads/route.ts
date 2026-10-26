import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import {
  runDailyPublicOwnerLeads,
  syncOutreachEngagementFromTracking,
} from '@/lib/public-owner-leads/daily-run';
import { syncZohoBounces } from '@/lib/zoho-bounce-sync';
import { syncInactiveTenantSuppressions } from '@/lib/email-suppression';
import { notifyCaptacionWave } from '@/lib/public-owner-leads/captacion-telegram';

/** Scrape + envío: necesita margen (Pro 300s). */
export const maxDuration = 300;

/**
 * Cron ~09:00 Europe/Madrid (1ª de 4 oleadas; tope día 200 si altas < 20).
 * Auth: Authorization Bearer CRON_SECRET
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const max = parseInt(req.nextUrl.searchParams.get('max') || '250', 10);
  const skipZoho = req.nextUrl.searchParams.get('skipZoho') === '1';

  // A+B+C: semillas + OSM + agencias/hoteles. No depende de env en Vercel.
  if (!process.env.PUBLIC_OWNER_LEADS_FLOW) {
    process.env.PUBLIC_OWNER_LEADS_FLOW = 'A+B+C';
  }

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

    let engagement: unknown = { updated: 0 };
    try {
      engagement = await syncOutreachEngagementFromTracking();
    } catch (e) {
      engagement = { error: e instanceof Error ? e.message : String(e) };
    }

    const { provincesForWave } = await import('@/lib/public-owner-leads/provinces-es');
    const provinces = provincesForWave('morning', 4);

    const outreach = await runDailyPublicOwnerLeads({
      dryRun,
      wave: 'morning',
      maxSend: Number.isFinite(max) ? max : 50,
      extractLimit: 32,
    });

    let telegram: unknown = null;
    if (!dryRun) {
      telegram = await notifyCaptacionWave({
        wave: 'morning',
        waveSent: outreach.sent,
        waveFailed: outreach.failed,
        skippedBecauseGoalMet: Boolean(outreach.skippedBecauseGoalMet),
      });
    }

    return NextResponse.json({
      success: true,
      wave: 'morning',
      provinces,
      flow: process.env.PUBLIC_OWNER_LEADS_FLOW || 'A+B+C',
      dryRun,
      zoho,
      tenants,
      engagement,
      outreach,
      telegram,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/public-owner-leads]', msg);
    // 200 parcial: Vercel no reintenta en bucle; el error queda en body
    return NextResponse.json({ success: false, wave: 'morning', error: msg }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
