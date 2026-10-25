import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import {
  runDailyPublicOwnerLeads,
  syncOutreachEngagementFromTracking,
} from '@/lib/public-owner-leads/daily-run';
import { syncZohoBounces } from '@/lib/zoho-bounce-sync';
import { syncInactiveTenantSuppressions } from '@/lib/email-suppression';

/** Scrape + envío: necesita margen (Pro 300s). */
export const maxDuration = 300;

/**
 * Cron ~09:00 Europe/Madrid:
 * - Invierno (CET UTC+1): vercel `0 8 * * *`
 * - Verano (CEST UTC+2): preferible `0 7 * * *` (ajustar en cambio horario)
 * 1) Zoho undelivered 2) opens/clicks 3) scrape + hasta 50 mails nuevos
 * Auth: Authorization Bearer CRON_SECRET
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const max = parseInt(req.nextUrl.searchParams.get('max') || '50', 10);
  const skipZoho = req.nextUrl.searchParams.get('skipZoho') === '1';

  // A+B: semillas + descubrimiento por lugares (OSM). No depende de env en Vercel.
  if (!process.env.PUBLIC_OWNER_LEADS_FLOW) {
    process.env.PUBLIC_OWNER_LEADS_FLOW = 'A+B';
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

    const outreach = await runDailyPublicOwnerLeads({
      dryRun,
      wave: 'morning',
      maxSend: Number.isFinite(max) ? max : 50,
      extractLimit: 18,
    });

    return NextResponse.json({
      success: true,
      wave: 'morning',
      flow: process.env.PUBLIC_OWNER_LEADS_FLOW || 'A+B',
      dryRun,
      zoho,
      tenants,
      engagement,
      outreach,
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
