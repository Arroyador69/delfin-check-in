/**
 * Runner compartido de oleada de captación (cron cada ~30 min).
 * Envía ≤50, para si meta 20 altas, refill cola ≥1000.
 * Telegram: solo en slots 12:00 y 16:00 (+ cierre 21h aparte).
 */

import {
  isPublicOwnerLeadsPaused,
  PUBLIC_OWNER_CHECKIN_PAID_DAILY_GOAL,
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN,
  PUBLIC_OWNER_LEADS_MIN_QUEUED,
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
  catchUpSendBudget,
  isProgressTelegramSlot,
  madridHalfHourSlot,
  waveFromSlot,
} from './wave-schedule';
import { sql } from '@/lib/db';

export type WaveCronResult = {
  success: boolean;
  wave: OutreachWave;
  slot: number | null;
  outsideWindow?: boolean;
  dryRun: boolean;
  engagement?: unknown;
  outreach?: Awaited<ReturnType<typeof runDailyPublicOwnerLeads>>;
  telegram?: unknown;
  /** Refill de emergencia antes de enviar si cola &lt; 150. */
  prefill?: unknown;
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
  /** No hacer prefill/refill pesado (rescate cuando hay due y poco tiempo). */
  skipStockRefill?: boolean;
}): Promise<WaveCronResult> {
  const dryRun = Boolean(opts?.dryRun);
  if (!process.env.PUBLIC_OWNER_LEADS_FLOW) {
    process.env.PUBLIC_OWNER_LEADS_FLOW = 'A+B+C';
  }

  const slot = madridHalfHourSlot();
  const wave: OutreachWave =
    opts?.wave || (slot != null ? waveFromSlot(slot) : 'morning');

  if (isPublicOwnerLeadsPaused() && !opts?.force) {
    return {
      success: true,
      wave,
      slot: slot ?? null,
      dryRun,
      error:
        'Captación pausada (PUBLIC_OWNER_LEADS_PAUSED) — sin oleadas hasta reactivar tras arreglar Zoho bienvenida',
    };
  }

  if (!opts?.force && opts?.wave == null && slot == null) {
    return {
      success: true,
      wave,
      slot: null,
      outsideWindow: true,
      dryRun,
      error: 'Fuera de ventana 08:00–20:30 Madrid — sin envío',
    };
  }

  try {
    let engagement: unknown = { updated: 0 };
    try {
      engagement = await syncOutreachEngagementFromTracking();
    } catch (e) {
      engagement = { error: e instanceof Error ? e.message : String(e) };
    }

    // Catch-up: si no hay meta Check-in y queda cupo, ampliar oleada al ritmo del día.
    let maxSend = opts?.maxSend ?? PUBLIC_OWNER_LEADS_WAVE_MAX;
    if (opts?.maxSend == null && !dryRun) {
      try {
        const paidR = await sql`
          SELECT COUNT(*)::int AS n FROM tenants
          WHERE plan_type IN ('checkin', 'standard', 'pro')
            AND updated_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
              AT TIME ZONE 'Europe/Madrid'
        `;
        const paidToday = Number(paidR.rows[0]?.n || 0);
        const touchR = await sql`
          SELECT COUNT(*)::int AS n FROM public_owner_leads
          WHERE COALESCE(last_touch_at, sent_at) >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
            AT TIME ZONE 'Europe/Madrid'
            AND (
              last_touch_kind IN ('cold', 'fu_click', 'fu_open', 'fu_silent', 'fu_recovery')
              OR (last_touch_kind IS NULL AND status = 'sent')
            )
        `;
        const sentToday = Number(touchR.rows[0]?.n || 0);
        if (paidToday < PUBLIC_OWNER_CHECKIN_PAID_DAILY_GOAL) {
          maxSend = catchUpSendBudget({
            sentToday,
            hardCap: PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
            waveMax: PUBLIC_OWNER_LEADS_WAVE_MAX,
            slot,
          });
        }
      } catch {
        /* keep WAVE_MAX */
      }
    }
    const progressKind = isProgressTelegramSlot(slot);

    // NUNCA rellenar ANTES de enviar. El 2026-11-04 la cola cold=0 + opendata
    // lento hizo timeout (300s) en cada cron → 0 mails pese a ~840 FU due.
    // Orden fijo: 1) enviar due/cola  2) refill best-effort  3) prepare hace el gordo.
    // skipStockRefill=1: solo enviar (rescate / catch-up sin tocar stock).
    const prefill: unknown = opts?.skipStockRefill
      ? { skipped: true, reason: 'skipStockRefill' }
      : { skipped: true, reason: 'send_first_never_block' };

    const outreach = await runDailyPublicOwnerLeads({
      dryRun,
      wave,
      maxSend,
      skipRefill: !dryRun && wave !== 'prepare',
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
          (progressKind === 'morning'
            ? 'Progreso fin de mañana (12:00) · 1/2 del día'
            : 'Progreso media tarde (16:00) · 2/2 del día · cierre a las 21:00') +
          ` · oleada: cold ${outreach.coldSent ?? 0} + FU ${outreach.fuSent ?? 0}`,
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

    // Post-envío: refill LIGHT (solo extract de pending). Opendata/OSM van en prepare;
    // si se meten aquí Vercel hace 504 y el día parece “roto” aunque el envío ya salió.
    let refillDeferred: unknown = null;
    if (
      !dryRun &&
      wave !== 'prepare' &&
      !outreach.skippedBecauseGoalMet &&
      !opts?.skipStockRefill
    ) {
      try {
        const { refillQueuedStock } = await import('./refill-queue');
        refillDeferred = await refillQueuedStock({
          target: PUBLIC_OWNER_LEADS_MIN_QUEUED,
          // Más extract post-oleada: priorizar NUNCA dejar cola a 0
          extractLimit: 90,
          opendataLimit: 0,
          light: true,
          alertIfStarved: true,
          starveBelow: 80,
        });
      } catch (e) {
        refillDeferred = {
          error: e instanceof Error ? e.message : String(e),
        };
      }
    } else if (opts?.skipStockRefill) {
      refillDeferred = { skipped: true };
    }

    return {
      success: true,
      wave,
      slot: slot ?? null,
      dryRun,
      engagement,
      outreach,
      telegram,
      prefill,
      refillDeferred,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[run-wave-cron]', msg);
    return { success: false, wave, slot: slot ?? null, dryRun, error: msg };
  }
}
