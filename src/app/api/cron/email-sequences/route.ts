import { NextRequest, NextResponse } from 'next/server';
import { processLifecycleEmailQueue } from '@/lib/email-sequences/engine';

function authorizeCron(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (req.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

/**
 * Cron diario: sincroniza inscripciones y envía emails lifecycle pendientes.
 * GET /api/cron/email-sequences
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const maxSends = parseInt(req.nextUrl.searchParams.get('max') || '40', 10);

  try {
    const result = await processLifecycleEmailQueue({
      dryRun,
      maxSends: Number.isFinite(maxSends) ? maxSends : 40,
    });

    return NextResponse.json({ success: true, dryRun, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/email-sequences]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
