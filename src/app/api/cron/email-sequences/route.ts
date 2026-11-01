import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import { processLifecycleEmailQueue } from '@/lib/email-sequences/engine';
import { retryFailedOnboardingEmails } from '@/lib/retry-failed-onboarding-emails';

export const maxDuration = 300;

/**
 * Cron lifecycle (Europe/Madrid invierno ≈ UTC+1):
 * - 07:15 (`15 6 * * *`) primera pasada
 * - 12:15 (`15 11 * * *`) segunda pasada
 * Lotes pequeños (default 20) para no timeout Vercel.
 * GET /api/cron/email-sequences?max=20
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const maxSends = parseInt(req.nextUrl.searchParams.get('max') || '20', 10);

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
