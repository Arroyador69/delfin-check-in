/**
 * Runner compartido de oleada de captación (cron cada ~30 min).
 * Envía ≤50, para si meta 20 altas, refill cola ≥1000.
 * Telegram: solo en slots 12:00 y 16:00 (+ cierre 21h aparte).
 */

import {
  PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN,
  PUBLIC_OWNER_LEADS_WAVE_MAX,
  PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
} from './constants';
import {
  runDailyPublicOwnerLeads,
  syncOutreachEngagementFromTracking,
  type OutreachWave,
} from './daily-run';
import { notifyCaptacionWave } from './captacion-telegram';
import {
  isProgressTelegramSlot,
  madridHalfHourSlot,
  waveFromSlot,
} from './wave-schedule';

export type WaveCronResult = {
  success: boolean;
  wave: OutreachWave;
  slot: number | null;
  outsideWindow?: boolean;
  dryRun: boolean;
  engagement?: unknown;
  outreach?: Awaited<ReturnType<typeof runDailyPublicOwnerLeads>>;
  telegram?: unknown;
  refillDeferred?: unknown;
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
    const progressKind = isProgressTelegramSlot(slot);
    // En slots de Telegram: enviar oleada SIN refill → avisar → refill.
    // Si el refill timeout, igual llega el progreso (el cron dedicado también cubre 12/16).
    const outreach = await runDailyPublicOwnerLeads({
      dryRun,
      wave,
      maxSend,
      skipRefill: Boolean(progressKind) && !dryRun,
      extractLimit:
        opts?.extractLimit ??
        (wave === 'prepare' ? PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN : 0),
    });

    let telegram: unknown = null;

    if (!dryRun && progressKind && !outreach.skippedBecauseGoalMet) {
      telegram = await notifyCaptacionWave({
        wave: 'progress',
        waveSent: outreach.sent,
        waveFailed: outreach.failed,
        extraNote:
          progressKind === 'morning'
            ? 'Progreso fin de mañana (12:00) · 1/2 del día'
            : 'Progreso media tarde (16:00) · 2/2 del día · cierre a las 21:00',
      });
    } else if (!dryRun && outreach.skippedBecauseGoalMet) {
      telegram = {
        skippedNotify: true,
        reason: 'goal_met_saved_for_tomorrow',
        signupGoal: PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
      };
    } else {
      telegram = { skippedNotify: true, reason: 'no_telegram_slot' };
    }

    // Refill diferido tras Telegram (slots progreso)
    let refillDeferred: unknown = null;
    if (!dryRun && progressKind && !outreach.skippedBecauseGoalMet) {
      try {
        const { refillQueuedStock } = await import('./refill-queue');
        const { PUBLIC_OWNER_LEADS_MIN_QUEUED } = await import('./constants');
        refillDeferred = await refillQueuedStock({
          target: PUBLIC_OWNER_LEADS_MIN_QUEUED,
          extractLimit: 28,
          opendataLimit: 120,
        });
      } catch (e) {
        refillDeferred = {
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    return {
      success: true,
      wave,
      slot: slot ?? null,
      dryRun,
      engagement,
      outreach,
      telegram,
      refillDeferred,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[run-wave-cron]', msg);
    return { success: false, wave, slot: slot ?? null, dryRun, error: msg };
  }
}
