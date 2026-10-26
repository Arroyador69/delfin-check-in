/**
 * Runner compartido de oleada de captación (cron cada ~30 min).
 * Envía ≤50, para si meta 20 altas, refill cola ≥1000, Telegram cada 150.
 */

import {
  PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN,
  PUBLIC_OWNER_LEADS_PROGRESS_EVERY,
  PUBLIC_OWNER_LEADS_WAVE_MAX,
  PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
} from './constants';
import {
  runDailyPublicOwnerLeads,
  syncOutreachEngagementFromTracking,
  type OutreachWave,
} from './daily-run';
import { notifyCaptacionProgressMilestones } from './captacion-telegram';
import { madridHalfHourSlot, waveFromSlot } from './wave-schedule';

export type WaveCronResult = {
  success: boolean;
  wave: OutreachWave;
  slot: number | null;
  outsideWindow?: boolean;
  dryRun: boolean;
  engagement?: unknown;
  outreach?: Awaited<ReturnType<typeof runDailyPublicOwnerLeads>>;
  telegram?: unknown;
  error?: string;
};

export async function runPublicOwnerLeadsWaveCron(opts?: {
  dryRun?: boolean;
  maxSend?: number;
  /** Forzar oleada (manual / rutas legacy). */
  wave?: OutreachWave;
  /** Ignorar ventana horaria (manual Superadmin). */
  force?: boolean;
  extractLimit?: number;
}): Promise<WaveCronResult> {
  const dryRun = Boolean(opts?.dryRun);
  if (!process.env.PUBLIC_OWNER_LEADS_FLOW) {
    process.env.PUBLIC_OWNER_LEADS_FLOW = 'A+B+C';
  }

  const slot = madridHalfHourSlot();
  const wave: OutreachWave =
    opts?.wave || (slot != null ? waveFromSlot(slot) : 'morning');

  if (!opts?.force && opts?.wave == null && slot == null) {
    return {
      success: true,
      wave,
      slot: null,
      outsideWindow: true,
      dryRun,
      error: 'Fuera de ventana 08:00–17:30 Madrid — sin envío',
    };
  }

  try {
    let engagement: unknown = { updated: 0 };
    try {
      engagement = await syncOutreachEngagementFromTracking();
    } catch (e) {
      engagement = { error: e instanceof Error ? e.message : String(e) };
    }

    const maxSend = opts?.maxSend ?? PUBLIC_OWNER_LEADS_WAVE_MAX;
    const outreach = await runDailyPublicOwnerLeads({
      dryRun,
      wave,
      maxSend,
      extractLimit: opts?.extractLimit ?? PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN,
    });

    let telegram: unknown = null;
    if (!dryRun && !outreach.skippedBecauseGoalMet) {
      // Telegram solo al cruzar 150 / 300 / … (no cada oleada de 50)
      telegram = await notifyCaptacionProgressMilestones({
        sentBefore: outreach.sentTodayBefore,
        sentAfter: outreach.sentTodayBefore + outreach.sent,
        wave,
        waveSent: outreach.sent,
        waveFailed: outreach.failed,
        every: PUBLIC_OWNER_LEADS_PROGRESS_EVERY,
      });
    } else if (!dryRun && outreach.skippedBecauseGoalMet) {
      // Meta 20: sin spam cada 30 min; el informe de cierre confirma CUMPLIDA.
      telegram = {
        skippedNotify: true,
        reason: 'goal_met_saved_for_tomorrow',
        signupGoal: PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
      };
    }

    return {
      success: true,
      wave,
      slot: slot ?? null,
      dryRun,
      engagement,
      outreach,
      telegram,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[run-wave-cron]', msg);
    return { success: false, wave, slot: slot ?? null, dryRun, error: msg };
  }
}
