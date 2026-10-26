import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import { processLifecycleEmailQueue } from '@/lib/email-sequences/engine';
import { retryFailedOnboardingEmails } from '@/lib/retry-failed-onboarding-emails';

/**
 * Cron diario: sincroniza inscripciones y envía emails lifecycle pendientes.
 * También reintenta onboarding fallidos (rate-limit Zoho, etc.).
 * GET /api/cron/email-sequences
 * Auth: Authorization Bearer CRON_SECRET (no confiar en x-vercel-cron).
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const maxSends = parseInt(req.nextUrl.searchParams.get('max') || '40', 10);

  try {
    let onboardingRetry: unknown = null;
    try {
      onboardingRetry = await retryFailedOnboardingEmails({
        dryRun,
        max: 15,
      });
    } catch (e) {
      onboardingRetry = {
        error: e instanceof Error ? e.message : String(e),
      };
    }

    const result = await processLifecycleEmailQueue({
      dryRun,
      maxSends: Number.isFinite(maxSends) ? maxSends : 40,
    });

    return NextResponse.json({ success: true, dryRun, onboardingRetry, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/email-sequences]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
