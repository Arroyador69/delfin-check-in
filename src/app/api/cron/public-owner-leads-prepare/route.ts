import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import { runDailyPublicOwnerLeads } from '@/lib/public-owner-leads/daily-run';
import { PUBLIC_OWNER_LEADS_MIN_QUEUED } from '@/lib/public-owner-leads/constants';
import { provincesForWave } from '@/lib/public-owner-leads/provinces-es';

export const maxDuration = 300;

/**
 * ~07:00 Europe/Madrid (invierno: vercel `0 6 * * *`).
 * Solo PREPARA cola (agencias/hoteles/dueños): NUNCA envía.
 * Rota provincias distintas a las oleadas del día (08:00–17:30).
 * Objetivo: ≥1000 queued antes de la primera oleada.
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
    const provinces = provincesForWave('prepare', 5);

    // Datos abiertos (GitHub JCyL etc.) → cola, sin enviar
    let opendata: unknown = null;
    if (!dryRun) {
      try {
        const { importJcylOpenDataToQueue } = await import(
          '@/lib/public-owner-leads/import-opendata'
        );
        opendata = await importJcylOpenDataToQueue({ limit: 80 });
      } catch (e) {
        opendata = { softFail: e instanceof Error ? e.message : String(e) };
      }
    }

    const outreach = await runDailyPublicOwnerLeads({
      dryRun,
      wave: 'prepare',
      maxSend: 0,
      extractLimit: 45,
    });

    return NextResponse.json({
      success: true,
      wave: 'prepare',
      send: false,
      minQueuedTarget: PUBLIC_OWNER_LEADS_MIN_QUEUED,
      provinces,
      opendata,
      flow: process.env.PUBLIC_OWNER_LEADS_FLOW || 'A+B+C',
      dryRun,
      outreach,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/public-owner-leads-prepare]', msg);
    return NextResponse.json(
      { success: false, wave: 'prepare', error: msg },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
