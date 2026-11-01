/**
 * Job diario: scrapea URLs pendientes → cola → envía hasta 50 mails prueba gratis.
 * Respeta suppression (bounces/bajas) y hosts bloqueados.
 */

import { sql } from '@/lib/db';
import { isEmailSuppressed } from '@/lib/email-suppression';
import {
  isPublicOwnerLeadsPaused,
  PUBLIC_OWNER_LEADS_COLD_DAILY_CAP,
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN,
  PUBLIC_OWNER_LEADS_FU_DAILY_CAP,
  PUBLIC_OWNER_LEADS_MIN_DELAY_MS,
  PUBLIC_OWNER_LEADS_MIN_QUEUED,
  PUBLIC_OWNER_LEADS_WAVE_MAX,
  PUBLIC_OWNER_CHECKIN_PAID_DAILY_GOAL,
} from './constants';
import { isPlausiblePublicEmail, scoreEmailForSource } from './emails';
import { extractPublicEmailsFromUrl, isBlockedOutreachHost, normalizeUrl } from './extract-web';
import {
  ensureSpainAgencySourceQueue,
  ensureSpainVacationSourceQueue,
  recycleEmptySources,
} from './ensure-source-queue';
import { sendTrackedOutreachLead } from './send-tracked';
import { selectDueFollowUps } from './select-followups';
import { stopSequenceByEmail } from './sequence-db';
import type { OutreachTouch } from './template';
import { sleep } from './fetch-html';
import { hostSuggestsNonVacation } from './spain-vacation-filter';
import type { OutreachAudience } from './spain-vacation-filter';

export type OutreachWave = 'morning' | 'afternoon' | 'evening' | 'night' | 'prepare';

export type DailyOutreachResult = {
  table_ready: boolean;
  dryRun: boolean;
  wave: OutreachWave;
  dailyTarget: number;
  sentTodayBefore: number;
  signupsTodayBefore: number;
  /** Onboardings completed today (Europe/Madrid) — meta de negocio. */
  onboardingsTodayBefore?: number;
  budget: number;
  skippedBecauseGoalMet?: boolean;
  sourcesProcessed: number;
  leadsDiscovered: number;
  queued: number;
  /** Total enviados en la oleada (coldSent + fuSent). */
  sent: number;
  /** Primer contacto (cold) enviados. */
  coldSent: number;
  /** Follow-ups (fu_click / fu_open / fu_silent) enviados. */
  fuSent: number;
  failed: number;
  skippedSuppressed: number;
  /** Tras enviar: stock rellenado (norma: nunca dejar cola a 0). */
  refill?: {
    queuedBefore: number;
    queuedAfter: number;
    opendataQueued: number;
    extracted: number;
  };
  errors: string[];
};

async function ensureTables(): Promise<boolean> {
  const meta = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
  return Boolean(meta.rows[0]?.reg);
}

/**
 * Tope del DÍA = 20 oleadas × 50 → HARD_CAP 1000.
 * No usar WAVE_MAX aquí como tope diario: si no, las oleadas posteriores se quedan sin cupo.
 */
function dailyCap(): number {
  const raw = Number(
    process.env.PUBLIC_OWNER_LEADS_DAILY_CAP || PUBLIC_OWNER_LEADS_DAILY_HARD_CAP
  );
  if (!Number.isFinite(raw) || raw < 1) return PUBLIC_OWNER_LEADS_DAILY_HARD_CAP;
  // Legacy: env 150/200/250 con hard cap 1000 → usar hard cap
  if (
    (raw === 150 || raw === 200 || raw === 250) &&
    PUBLIC_OWNER_LEADS_DAILY_HARD_CAP > raw
  ) {
    return PUBLIC_OWNER_LEADS_DAILY_HARD_CAP;
  }
  return Math.min(PUBLIC_OWNER_LEADS_DAILY_HARD_CAP, Math.floor(raw));
}

/** Toques (cold+FU) enviados hoy — usa last_touch_at con fallback a sent_at. */
async function countSentToday(): Promise<number> {
  const r = await sql`
    SELECT COUNT(*)::int AS n
    FROM public_owner_leads
    WHERE COALESCE(last_touch_at, sent_at) >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
      AT TIME ZONE 'Europe/Madrid'
      AND (
        last_touch_kind IN ('cold', 'fu_click', 'fu_open', 'fu_silent')
        OR (last_touch_kind IS NULL AND status = 'sent')
      )
  `;
  return Number(r.rows[0]?.n || 0);
}

async function countColdToday(): Promise<number> {
  const r = await sql`
    SELECT COUNT(*)::int AS n
    FROM public_owner_leads
    WHERE COALESCE(last_touch_at, sent_at) >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
      AT TIME ZONE 'Europe/Madrid'
      AND (
        last_touch_kind = 'cold'
        OR (last_touch_kind IS NULL AND status = 'sent' AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid')
      )
  `;
  return Number(r.rows[0]?.n || 0);
}

async function countFuToday(): Promise<number> {
  const r = await sql`
    SELECT COUNT(*)::int AS n
    FROM public_owner_leads
    WHERE last_touch_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
      AT TIME ZONE 'Europe/Madrid'
      AND last_touch_kind IN ('fu_click', 'fu_open', 'fu_silent')
  `;
  return Number(r.rows[0]?.n || 0);
}

async function countSignupsToday(): Promise<number> {
  const r = await sql`
    SELECT COUNT(*)::int AS n
    FROM public_owner_leads
    WHERE signed_up_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
      AT TIME ZONE 'Europe/Madrid'
  `;
  return Number(r.rows[0]?.n || 0);
}

/** Onboardings completados hoy (meta de negocio: 20/día). */
async function countCompletedOnboardingsToday(): Promise<number> {
  const r = await sql`
    SELECT COUNT(*)::int AS n
    FROM tenants
    WHERE onboarding_status = 'completed'
      AND updated_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
        AT TIME ZONE 'Europe/Madrid'
  `;
  return Number(r.rows[0]?.n || 0);
}

/** Planes de pago (Check-in / standard / pro) tocados hoy — meta rentable. */
async function countCheckinPaidToday(): Promise<number> {
  try {
    const r = await sql`
      SELECT COUNT(*)::int AS n
      FROM tenants
      WHERE plan_type IN ('checkin', 'standard', 'pro')
        AND updated_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
          AT TIME ZONE 'Europe/Madrid'
    `;
    return Number(r.rows[0]?.n || 0);
  } catch {
    return 0;
  }
}

async function processPendingSources(
  limit: number,
  dryRun: boolean
): Promise<{ processed: number; discovered: number; errors: string[] }> {
  const sourcesMeta = await sql`SELECT to_regclass('public.public_owner_lead_sources') AS reg`;
  if (!sourcesMeta.rows[0]?.reg) {
    return { processed: 0, discovered: 0, errors: ['Tabla public_owner_lead_sources ausente'] };
  }

  const pending = await sql`
    SELECT id, url
    FROM public_owner_lead_sources
    WHERE status = 'pending'
    ORDER BY
      CASE WHEN last_scraped_at IS NULL THEN 0 ELSE 1 END ASC,
      created_at DESC
    LIMIT ${limit}
  `;

  let processed = 0;
  let discovered = 0;
  const errors: string[] = [];

  for (const row of pending.rows) {
    const id = String(row.id);
    const url = normalizeUrl(String(row.url || ''));
    processed++;

    if (dryRun) continue;

    try {
      if (isBlockedOutreachHost(url)) {
        await sql`
          UPDATE public_owner_lead_sources
          SET status = 'blocked', last_error = 'blocked-host', updated_at = NOW(), last_scraped_at = NOW()
          WHERE id = ${id}::uuid
        `;
        continue;
      }

      const { leads, blocked, error } = await extractPublicEmailsFromUrl(url);
      if (blocked) {
        await sql`
          UPDATE public_owner_lead_sources
          SET status = 'blocked', last_error = ${error || 'blocked'}, updated_at = NOW(), last_scraped_at = NOW()
          WHERE id = ${id}::uuid
        `;
        continue;
      }

      let found = 0;
      for (const lead of leads) {
        const aud = lead.audience || 'owner';
        const noteTag =
          aud === 'agency'
            ? `flow-c:agency:${new Date().toISOString().slice(0, 10)}`
            : aud === 'hotel'
              ? `extract:hotel:${new Date().toISOString().slice(0, 10)}`
              : `extract:${new Date().toISOString().slice(0, 10)}`;
        const ins = await sql`
          INSERT INTO public_owner_leads (email, domain, source_url, status, notes)
          VALUES (
            ${lead.email},
            ${lead.domain},
            ${lead.source_url},
            'new',
            ${noteTag}
          )
          ON CONFLICT (email) DO NOTHING
          RETURNING id
        `;
        if (ins.rows[0]?.id) {
          found++;
          discovered++;
        }
      }

      await sql`
        UPDATE public_owner_lead_sources
        SET
          status = 'done',
          emails_found = ${found},
          last_error = NULL,
          last_scraped_at = NOW(),
          updated_at = NOW()
        WHERE id = ${id}::uuid
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${url}: ${msg}`);
      try {
        await sql`
          UPDATE public_owner_lead_sources
          SET status = 'failed', last_error = ${msg.slice(0, 400)}, updated_at = NOW(), last_scraped_at = NOW()
          WHERE id = ${id}::uuid
        `;
      } catch {
        /* Neon caído: no tumbar toda la oleada */
      }
      if (/fetch failed|Connect Timeout|NeonDbError/i.test(msg)) {
        await sleep(2000);
      }
    }
  }

  return { processed, discovered, errors };
}

async function queueNewLeads(limit: number, dryRun: boolean): Promise<number> {
  if (dryRun) return 0;
  const r = await sql`
    WITH cte AS (
      SELECT id
      FROM public_owner_leads
      WHERE status = 'new' AND opted_out = false
      ORDER BY created_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public_owner_leads p
    SET status = 'queued', queued_at = NOW(), updated_at = NOW()
    FROM cte
    WHERE p.id = cte.id
    RETURNING p.id
  `;
  return r.rows.length;
}

function normalizeWave(w?: OutreachWave): OutreachWave {
  if (w === 'afternoon' || w === 'evening' || w === 'night' || w === 'prepare') return w;
  return 'morning';
}

function waveMaxDefault(wave: OutreachWave): number {
  if (wave === 'prepare') return 0; // solo rellenar cola, no enviar
  return PUBLIC_OWNER_LEADS_WAVE_MAX; // 50 — Zoho-safe, todas las franjas
}

function waveOsmOffset(wave: OutreachWave): number {
  if (wave === 'afternoon') return 1;
  if (wave === 'evening') return 2;
  if (wave === 'night') return 3;
  if (wave === 'prepare') return 4;
  return 0;
}

export async function runDailyPublicOwnerLeads(opts?: {
  dryRun?: boolean;
  maxSend?: number;
  extractLimit?: number;
  /** Franja del día (morning…night) o prepare. Meta 20 → skip envío, cola para mañana. */
  wave?: OutreachWave;
  /** Si true, no refill al final (p.ej. para mandar Telegram antes del scrape). */
  skipRefill?: boolean;
}): Promise<DailyOutreachResult> {
  const dryRun = Boolean(opts?.dryRun);
  const wave = normalizeWave(opts?.wave);
  const cap = dailyCap();
  const errors: string[] = [];
  const skipRefill = Boolean(opts?.skipRefill);

  const ready = await ensureTables();
  if (!ready) {
    return {
      table_ready: false,
      dryRun,
      wave,
      dailyTarget: cap,
      sentTodayBefore: 0,
      signupsTodayBefore: 0,
      budget: 0,
      sourcesProcessed: 0,
      leadsDiscovered: 0,
      queued: 0,
      sent: 0,
      coldSent: 0,
      fuSent: 0,
      failed: 0,
      skippedSuppressed: 0,
      errors: ['Ejecuta database/migration-public-owner-leads.sql (+ tracking) en Neon'],
    };
  }

  const sentTodayBefore = await countSentToday();
  const signupsTodayBefore = await countSignupsToday();
  const onboardingsTodayBefore = await countCompletedOnboardingsToday();
  const checkinPaidTodayBefore = await countCheckinPaidToday();

  // Kill switch: sin envíos cold (prepare/refill sí pueden seguir con maxSend=0).
  if (
    wave !== 'prepare' &&
    isPublicOwnerLeadsPaused() &&
    (opts?.maxSend == null || opts.maxSend > 0)
  ) {
    return {
      table_ready: true,
      dryRun,
      wave,
      dailyTarget: cap,
      sentTodayBefore,
      signupsTodayBefore,
      onboardingsTodayBefore,
      budget: 0,
      sourcesProcessed: 0,
      leadsDiscovered: 0,
      queued: 0,
      sent: 0,
      coldSent: 0,
      fuSent: 0,
      failed: 0,
      skippedSuppressed: 0,
      skippedBecauseGoalMet: false,
      errors: [
        'Captación pausada (PUBLIC_OWNER_LEADS_PAUSED) — sin oleadas hasta reactivar',
      ],
    };
  }

  // Oleadas: meta rentable = ≥10 Plan Check-in (pago) hoy → stop; cola para mañana.
  // prepare: siempre rellena cola (maxSend=0). Aunque no enviemos: SIEMPRE refill MIN_QUEUED.
  if (
    wave !== 'prepare' &&
    checkinPaidTodayBefore >= PUBLIC_OWNER_CHECKIN_PAID_DAILY_GOAL
  ) {
    let refillSummary: DailyOutreachResult['refill'];
    if (!dryRun) {
      try {
        const { refillQueuedStock } = await import('./refill-queue');
        const refill = await refillQueuedStock({
          target: PUBLIC_OWNER_LEADS_MIN_QUEUED,
          extractLimit: 28,
          opendataLimit: 120,
        });
        refillSummary = {
          queuedBefore: refill.queuedBefore,
          queuedAfter: refill.queuedAfter,
          opendataQueued: refill.opendataQueued,
          extracted: refill.extracted,
        };
      } catch (e) {
        errors.push(`refill:fail:${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return {
      table_ready: true,
      dryRun,
      wave,
      dailyTarget: cap,
      sentTodayBefore,
      signupsTodayBefore,
      onboardingsTodayBefore,
      budget: 0,
      skippedBecauseGoalMet: true,
      sourcesProcessed: 0,
      leadsDiscovered: 0,
      queued: 0,
      sent: 0,
      coldSent: 0,
      fuSent: 0,
      failed: 0,
      skippedSuppressed: 0,
      refill: refillSummary,
      errors,
    };
  }

  const waveMax = opts?.maxSend ?? waveMaxDefault(wave);
  const budget = Math.max(0, Math.min(cap - sentTodayBefore, waveMax));

  // Contar cola YA: si hay stock para la oleada, saltar seed/OSM/extract y ENVIAR.
  // (Antes se scrapeba primero → timeout Vercel / 0 enviados con cola llena.)
  let queuedAhead = 0;
  try {
    const q = await sql`
      SELECT COUNT(*)::int AS n FROM public_owner_leads
      WHERE status = 'queued' AND opted_out = false
    `;
    queuedAhead = Number(q.rows[0]?.n || 0);
  } catch {
    queuedAhead = 0;
  }
  const sendBudgetPreview = wave === 'prepare' ? 0 : budget;
  const queueCoversWave =
    wave !== 'prepare' && sendBudgetPreview > 0 && queuedAhead >= sendBudgetPreview;
  const needDiscover =
    wave === 'prepare' || (!queueCoversWave && queuedAhead < Math.max(budget * 2, 80));

  // Autonomía: semillas + reabrir fuentes vacías — solo si hace falta stock
  if (!dryRun && !queueCoversWave) {
    try {
      const seeded = await ensureSpainVacationSourceQueue();
      if (seeded.inserted > 0) {
        errors.push(`seed:+${seeded.inserted} (pending era ${seeded.pendingBefore})`);
      }
      const recycled = await recycleEmptySources(wave === 'prepare' ? 80 : 40);
      if (recycled > 0) errors.push(`recycle:+${recycled}`);
    } catch (e) {
      errors.push(`seed:${e instanceof Error ? e.message : String(e)}`);
    }
  } else if (!dryRun && queueCoversWave) {
    errors.push(`seed:skip cola=${queuedAhead}≥budget=${sendBudgetPreview} (prioridad enviar)`);
  }

  // Flujo A+B+C por defecto: semillas + OSM + agencias.
  // Override: PUBLIC_OWNER_LEADS_FLOW=A | B | C | A+B | A+B+C
  // Fallos OSM NUNCA tumban el cron (catch + deadline corto).
  const flowMode = String(process.env.PUBLIC_OWNER_LEADS_FLOW || 'A+B+C').toUpperCase();
  const useFlowB =
    flowMode === 'B' ||
    flowMode.includes('B') ||
    flowMode === 'AB' ||
    flowMode === 'A+B' ||
    flowMode === 'A+B+C';
  const useFlowC =
    flowMode === 'C' ||
    flowMode.includes('C') ||
    flowMode === 'A+B+C' ||
    wave === 'evening' ||
    wave === 'night';

  if (!dryRun && useFlowC && !queueCoversWave) {
    try {
      const agencySeed = await ensureSpainAgencySourceQueue();
      if (agencySeed.inserted > 0) {
        errors.push(`flow-c:seed:+${agencySeed.inserted}`);
      }
    } catch (e) {
      errors.push(`flow-c:soft-fail:${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!dryRun && useFlowB && needDiscover) {
    try {
      const { discoverOwnerSitesByPlace } = await import('./discover-by-place');
      const { provincesForWave } = await import('./provinces-es');
      const provs = provincesForWave(wave, 4);
      errors.push(`provincias:${provs.join('|')}`);
      const disc = await discoverOwnerSitesByPlace({
        maxPlaces:
          wave === 'prepare' ? 8 : wave === 'night' || wave === 'evening' ? 4 : wave === 'afternoon' ? 4 : 3,
        maxCandidates:
          wave === 'prepare' ? 40 : wave === 'night' || wave === 'evening' ? 20 : 16,
        delayMs: 300,
        deadlineMs:
          wave === 'prepare'
            ? 90_000
            : wave === 'night' || wave === 'evening'
              ? 45_000
              : wave === 'afternoon'
                ? 40_000
                : 35_000,
        waveOffset: waveOsmOffset(wave),
      });
      let inserted = 0;
      for (const url of disc.candidateUrls) {
        try {
          const r = await sql`
            INSERT INTO public_owner_lead_sources (url, status)
            VALUES (${url}, 'pending')
            ON CONFLICT (url) DO NOTHING
            RETURNING id
          `;
          if (r.rows[0]?.id) inserted++;
        } catch {
          /* ignore row */
        }
      }
      for (const row of disc.emailsFromOsm) {
        try {
          const host = String(row.website || '')
            .replace(/^https?:\/\//i, '')
            .replace(/^www\./i, '')
            .split('/')[0]
            .toLowerCase();
          if (!host) continue;
          await sql`
            INSERT INTO public_owner_leads (email, domain, source_url, status, notes)
            VALUES (
              ${row.email},
              ${host},
              ${row.website},
              'new',
              ${`flow-b-osm:${row.place}`}
            )
            ON CONFLICT (email) DO NOTHING
          `;
        } catch {
          /* ignore row */
        }
      }
      errors.push(
        `flow-b:ok places=${disc.places.length} candidates=+${inserted} osmEmails=${disc.emailsFromOsm.length}`
      );
    } catch (e) {
      // No rethrow: seguir con semillas / cola existente
      errors.push(`flow-b:soft-fail:${e instanceof Error ? e.message : String(e)}`);
    }
  } else if (!dryRun && useFlowB && !needDiscover) {
    errors.push(`flow-b:skip cola=${queuedAhead}≥budget×2 (prioridad enviar)`);
  }

  // Extraer / scrapear: SOLO si hace falta stock para esta oleada.
  // Si ya hay ≥ budget en cola, NO scrapear antes de enviar (evita timeout Vercel
  // y deja la oleada en 0 enviados). El refill post-envío recupera MIN_QUEUED.
  let extractLimit = opts?.extractLimit ?? PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN;
  const queuedNow = queuedAhead;
  if (queueCoversWave || (wave !== 'prepare' && sendBudgetPreview > 0 && queuedNow >= sendBudgetPreview)) {
    extractLimit = 0;
    errors.push(
      `extract:skip cola=${queuedNow}≥budget=${sendBudgetPreview} (prioridad enviar; refill después)`
    );
  } else if (queuedNow < PUBLIC_OWNER_LEADS_MIN_QUEUED || wave === 'prepare') {
    if (opts?.extractLimit == null || opts.extractLimit > 0) {
      extractLimit = Math.max(extractLimit, wave === 'prepare' ? 45 : 32);
      errors.push(
        `stock:queued=${queuedNow}<${PUBLIC_OWNER_LEADS_MIN_QUEUED} → extract↑${extractLimit}`
      );
    }
  }

  const extract =
    extractLimit > 0
      ? await processPendingSources(extractLimit, dryRun)
      : { processed: 0, discovered: 0, errors: [] as string[] };
  errors.push(...extract.errors);

  const queued =
    extractLimit > 0
      ? await queueNewLeads(
          Math.max(budget, extractLimit, PUBLIC_OWNER_LEADS_MIN_QUEUED),
          dryRun
        )
      : 0;

  // Prepare: forzar budget 0 (nunca enviar en esta oleada)
  const sendBudget = wave === 'prepare' ? 0 : budget;

  let sent = 0;
  let fuSent = 0;
  let coldSent = 0;
  let failed = 0;
  let skippedSuppressed = 0;

  if (sendBudget > 0 && !dryRun) {
    const hardLeft = Math.max(0, cap - sentTodayBefore);
    const room = Math.min(sendBudget, hardLeft, PUBLIC_OWNER_LEADS_WAVE_MAX);
    const coldToday = await countColdToday();
    const fuToday = await countFuToday();
    let fuRoom = Math.min(room, Math.max(0, PUBLIC_OWNER_LEADS_FU_DAILY_CAP - fuToday));
    if (coldToday >= PUBLIC_OWNER_LEADS_COLD_DAILY_CAP) {
      fuRoom = Math.min(room, hardLeft);
    }

    let fuDueCount = 0;
    // 1) Follow-ups primero (A click → B open → C silencio)
    try {
      const due = await selectDueFollowUps(fuRoom);
      fuDueCount = due.length;
      errors.push(`fu:due=${due.length} room=${fuRoom} today=${fuToday}`);
      for (const lead of due) {
        const email = lead.email.toLowerCase();
        const notes = String(lead.notes || '');
        let audience: OutreachAudience = 'owner';
        if (/agency|flow-c|gestora|gesti[oó]n/i.test(notes)) audience = 'agency';
        else if (/hotel|hostal/i.test(notes)) audience = 'hotel';
        const touch = (lead.nextTouchKind || 'fu_open') as OutreachTouch;
        if (touch === 'cold') continue;
        try {
          if (await isEmailSuppressed(email)) {
            skippedSuppressed++;
            // Cerrar secuencia: si no, volvería a salir due en cada oleada.
            await stopSequenceByEmail(email, 'optout');
            continue;
          }
        } catch {
          /* ignore */
        }
        const result = await sendTrackedOutreachLead({
          id: lead.id,
          email,
          domain: lead.domain || '',
          source_url: lead.sourceUrl || '',
          audience,
          touch,
        });
        if (result.ok) {
          sent++;
          fuSent++;
        } else {
          failed++;
          if (result.error) errors.push(`fu:${email}: ${result.error}`);
          // Rate-limit FU: saltar este lead y seguir; NO matar el cold de la oleada.
          if (result.retryable) {
            errors.push('fu:rate-limit-skip-lead');
            await sleep(PUBLIC_OWNER_LEADS_MIN_DELAY_MS * 2);
            continue;
          }
        }
        await sleep(PUBLIC_OWNER_LEADS_MIN_DELAY_MS);
      }
    } catch (e) {
      errors.push(`fu:select-fail:${e instanceof Error ? e.message : String(e)}`);
    }

    // 2) Cold: SIEMPRE rellenar el hueco de la oleada hasta COLD_CAP / HARD.
    // Si no hay más FU due, el cold puede usar todo el room restante (hasta hard).
    // Así no nos quedamos a media jornada por debajo del tope sin meta Check-in.
    const afterFu = Math.max(0, room - fuSent);
    const coldLeftCap = Math.max(0, PUBLIC_OWNER_LEADS_COLD_DAILY_CAP - coldToday);
    const hardLeftAfterFu = Math.max(0, hardLeft - fuSent);
    let coldRoom =
      fuDueCount === 0
        ? Math.min(afterFu, hardLeftAfterFu) // sin FU: empujar cold hasta agotar oleada/hard
        : Math.min(afterFu, coldLeftCap, hardLeftAfterFu);
    errors.push(
      `cold:room=${coldRoom} afterFu=${afterFu} coldLeft=${coldLeftCap} fuDue=${fuDueCount}`
    );

    const queue = await sql`
      SELECT id, email, domain, source_url, notes
      FROM public_owner_leads
      WHERE status = 'queued' AND opted_out = false
      ORDER BY
        CASE
          WHEN notes ILIKE '%flow-c%' OR notes ILIKE '%agency%' OR notes ILIKE '%prepare:agency%' THEN 0
          WHEN notes ILIKE '%hotel%' THEN 1
          ELSE 2
        END ASC,
        queued_at ASC NULLS LAST,
        created_at ASC
      LIMIT ${coldRoom}
    `;

    /** Emails ya enviados (nunca cold duplicado). */
    const emailsSent = new Set<string>();
    const alreadyEmail = await sql`
      SELECT lower(email) AS e FROM public_owner_leads WHERE status = 'sent'
    `;
    for (const r of alreadyEmail.rows) {
      if (r.e) emailsSent.add(String(r.e));
    }

    for (const row of queue.rows) {
      const email = String(row.email || '').toLowerCase();
      const domain = String(row.domain || '')
        .toLowerCase()
        .replace(/^www\./i, '');
      const src = String(row.source_url || row.domain || '');

      if (emailsSent.has(email)) {
        skippedSuppressed++;
        await sql`
          UPDATE public_owner_leads
          SET status = 'skipped', updated_at = NOW(),
              notes = COALESCE(notes, '') || ' | skip:email-already-sent'
          WHERE id = ${row.id}::uuid
        `;
        continue;
      }

      if (!isPlausiblePublicEmail(email) || scoreEmailForSource(email, src || domain) < 0) {
        skippedSuppressed++;
        await sql`
          UPDATE public_owner_leads
          SET status = 'bounced', last_error = 'invalid-extract', updated_at = NOW(),
              notes = COALESCE(notes, '') || ' | bounced:pre-send-filter'
          WHERE id = ${row.id}::uuid
        `;
        continue;
      }
      try {
        if (await isEmailSuppressed(email)) {
          skippedSuppressed++;
          await sql`
            UPDATE public_owner_leads
            SET status = 'skipped', updated_at = NOW(),
                notes = COALESCE(notes, '') || ' | suppressed'
            WHERE id = ${row.id}::uuid
          `;
          continue;
        }
      } catch {
        /* si no hay tabla suppression, seguir */
      }

      if (isBlockedOutreachHost(src) || hostSuggestsNonVacation(src)) {
        failed++;
        await sql`
          UPDATE public_owner_leads
          SET status = 'skipped', updated_at = NOW(),
              notes = COALESCE(notes, '') || ' | blocked-non-vacation-es'
          WHERE id = ${row.id}::uuid
        `;
        continue;
      }

      const notes = String(row.notes || '');
      let audience: OutreachAudience = 'owner';
      if (/agency|flow-c|gestora|gesti[oó]n/i.test(notes)) audience = 'agency';
      else if (/hotel|hostal/i.test(notes)) audience = 'hotel';

      const result = await sendTrackedOutreachLead({
        id: String(row.id),
        email,
        domain: String(row.domain || ''),
        source_url: String(row.source_url || ''),
        audience,
        touch: 'cold',
      });
      if (result.ok) {
        sent++;
        coldSent++;
        emailsSent.add(email);
      } else {
        failed++;
        if (result.error) errors.push(`${email}: ${result.error}`);
        if (result.retryable) {
          errors.push('abort:zoho-rate-limit');
          break;
        }
      }
      await sleep(PUBLIC_OWNER_LEADS_MIN_DELAY_MS);
    }
    errors.push(`wave:fuSent=${fuSent} coldSent=${coldSent}`);
  }

  // NORMA: tras CADA envío (o prepare), rellenar cola. Nunca a 0.
  // skipRefill: el caller manda Telegram primero y rellena después (anti-timeout).
  let refillSummary: DailyOutreachResult['refill'];
  if (!dryRun && !skipRefill) {
    try {
      const { refillQueuedStock } = await import('./refill-queue');
      const refill = await refillQueuedStock({
        target: PUBLIC_OWNER_LEADS_MIN_QUEUED,
        extractLimit: wave === 'prepare' ? 40 : 28,
        opendataLimit: 120,
      });
      refillSummary = {
        queuedBefore: refill.queuedBefore,
        queuedAfter: refill.queuedAfter,
        opendataQueued: refill.opendataQueued,
        extracted: refill.extracted,
      };
      if (refill.errors.length) {
        errors.push(...refill.errors.map((e) => `refill:${e}`));
      }
      errors.push(
        `refill:ok queued ${refill.queuedBefore}→${refill.queuedAfter} (target ${PUBLIC_OWNER_LEADS_MIN_QUEUED})`
      );
    } catch (e) {
      errors.push(`refill:fail:${e instanceof Error ? e.message : String(e)}`);
      try {
        await ensureSpainVacationSourceQueue();
      } catch {
        /* ignore */
      }
    }
  } else if (skipRefill) {
    errors.push('refill:deferred');
  }

  return {
    table_ready: true,
    dryRun,
    wave,
    dailyTarget: cap,
    sentTodayBefore,
    signupsTodayBefore,
    onboardingsTodayBefore,
    budget: sendBudget,
    sourcesProcessed: extract.processed,
    leadsDiscovered: extract.discovered,
    queued,
    sent,
    coldSent,
    fuSent,
    failed,
    skippedSuppressed,
    refill: refillSummary,
    errors: errors.slice(0, 28),
  };
}

/** Sincroniza opens/clicks desde email_tracking → public_owner_leads. */
export async function syncOutreachEngagementFromTracking(): Promise<{ updated: number }> {
  const meta = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
  if (!meta.rows[0]?.reg) return { updated: 0 };
  const trackMeta = await sql`SELECT to_regclass('public.email_tracking') AS reg`;
  if (!trackMeta.rows[0]?.reg) return { updated: 0 };

  const r = await sql`
    UPDATE public_owner_leads p
    SET
      opened_at = COALESCE(p.opened_at, et.opened_at),
      clicked_at = COALESCE(p.clicked_at, et.clicked_at),
      updated_at = NOW()
    FROM email_tracking et
    WHERE p.tracking_id = et.id
      AND (
        (et.opened_at IS NOT NULL AND p.opened_at IS NULL)
        OR (et.clicked_at IS NOT NULL AND p.clicked_at IS NULL)
      )
    RETURNING p.id
  `;
  return { updated: r.rows.length };
}
