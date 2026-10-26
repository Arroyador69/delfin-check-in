/**
 * Job diario: scrapea URLs pendientes → cola → envía hasta 50 mails prueba gratis.
 * Respeta suppression (bounces/bajas) y hosts bloqueados.
 */

import { sql } from '@/lib/db';
import { isEmailSuppressed } from '@/lib/email-suppression';
import {
  PUBLIC_OWNER_LEADS_AFTERNOON_MAX,
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_DAILY_TARGET,
  PUBLIC_OWNER_LEADS_EVENING_MAX,
  PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN,
  PUBLIC_OWNER_LEADS_MIN_DELAY_MS,
  PUBLIC_OWNER_LEADS_MIN_QUEUED,
  PUBLIC_OWNER_LEADS_NIGHT_MAX,
  PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
} from './constants';
import { isPlausiblePublicEmail, scoreEmailForSource } from './emails';
import { extractPublicEmailsFromUrl, isBlockedOutreachHost, normalizeUrl } from './extract-web';
import {
  ensureSpainAgencySourceQueue,
  ensureSpainVacationSourceQueue,
  recycleEmptySources,
} from './ensure-source-queue';
import { sendTrackedOutreachLead } from './send-tracked';
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
  budget: number;
  skippedBecauseGoalMet?: boolean;
  sourcesProcessed: number;
  leadsDiscovered: number;
  queued: number;
  sent: number;
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
 * Tope del DÍA = 4 oleadas × 250 → HARD_CAP 1000.
 * No usar DAILY_TARGET aquí como tope diario: si no, las oleadas posteriores se quedan sin cupo.
 */
function dailyCap(): number {
  const raw = Number(
    process.env.PUBLIC_OWNER_LEADS_DAILY_CAP || PUBLIC_OWNER_LEADS_DAILY_HARD_CAP
  );
  if (!Number.isFinite(raw) || raw < 1) return PUBLIC_OWNER_LEADS_DAILY_HARD_CAP;
  // Legacy: env 150/200 con hard cap subido → usar hard cap nuevo
  if (
    (raw === 150 || raw === 200) &&
    PUBLIC_OWNER_LEADS_DAILY_HARD_CAP > raw
  ) {
    return PUBLIC_OWNER_LEADS_DAILY_HARD_CAP;
  }
  return Math.min(PUBLIC_OWNER_LEADS_DAILY_HARD_CAP, Math.floor(raw));
}

async function countSentToday(): Promise<number> {
  const r = await sql`
    SELECT COUNT(*)::int AS n
    FROM public_owner_leads
    WHERE status = 'sent'
      AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
        AT TIME ZONE 'Europe/Madrid'
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
  if (wave === 'afternoon') return PUBLIC_OWNER_LEADS_AFTERNOON_MAX;
  if (wave === 'evening') return PUBLIC_OWNER_LEADS_EVENING_MAX;
  if (wave === 'night') return PUBLIC_OWNER_LEADS_NIGHT_MAX;
  return PUBLIC_OWNER_LEADS_DAILY_TARGET;
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
  /** morning ~09:00; afternoon ~15:00 / evening ~18:00 si altas < meta 20 */
  wave?: OutreachWave;
}): Promise<DailyOutreachResult> {
  const dryRun = Boolean(opts?.dryRun);
  const wave = normalizeWave(opts?.wave);
  const cap = dailyCap();
  const errors: string[] = [];

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
      failed: 0,
      skippedSuppressed: 0,
      errors: ['Ejecuta database/migration-public-owner-leads.sql (+ tracking) en Neon'],
    };
  }

  const sentTodayBefore = await countSentToday();
  const signupsTodayBefore = await countSignupsToday();

  // Tarde/noche/cierre 20h: solo si aún no llegamos a 20 altas; nunca reenvía
  // prepare: siempre rellena cola (maxSend=0)
  // Aunque no enviemos: SIEMPRE recargar cola (norma MIN_QUEUED).
  if (
    (wave === 'afternoon' || wave === 'evening' || wave === 'night') &&
    signupsTodayBefore >= PUBLIC_OWNER_SIGNUPS_DAILY_GOAL
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
      budget: 0,
      skippedBecauseGoalMet: true,
      sourcesProcessed: 0,
      leadsDiscovered: 0,
      queued: 0,
      sent: 0,
      failed: 0,
      skippedSuppressed: 0,
      refill: refillSummary,
      errors,
    };
  }

  const waveMax = opts?.maxSend ?? waveMaxDefault(wave);
  const budget = Math.max(0, Math.min(cap - sentTodayBefore, waveMax));

  // Autonomía: semillas + reabrir fuentes vacías (rotar provincias vía OSM/wave)
  if (!dryRun) {
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

  if (!dryRun && useFlowC) {
    try {
      const agencySeed = await ensureSpainAgencySourceQueue();
      if (agencySeed.inserted > 0) {
        errors.push(`flow-c:seed:+${agencySeed.inserted}`);
      }
    } catch (e) {
      errors.push(`flow-c:soft-fail:${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Si ya hay cola suficiente para esta oleada, no gastar el timeout en OSM:
  // prioridad = enviar hasta 250 y luego refill.
  let queuedAhead = 0;
  if (!dryRun) {
    try {
      const q = await sql`
        SELECT COUNT(*)::int AS n FROM public_owner_leads
        WHERE status = 'queued' AND opted_out = false
      `;
      queuedAhead = Number(q.rows[0]?.n || 0);
    } catch {
      queuedAhead = 0;
    }
  }
  const needDiscover = wave === 'prepare' || queuedAhead < Math.max(budget * 2, 80);

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

  // Extraer si cola baja. Prepare/mañana priorizan relleno.
  let extractLimit = opts?.extractLimit ?? PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN;
  if (!dryRun) {
    try {
      const qn = await sql`
        SELECT COUNT(*)::int AS n FROM public_owner_leads
        WHERE status = 'queued' AND opted_out = false
      `;
      const queuedNow = Number(qn.rows[0]?.n || 0);
      if (queuedNow < PUBLIC_OWNER_LEADS_MIN_QUEUED || wave === 'prepare') {
        extractLimit = Math.max(
          extractLimit,
          wave === 'prepare' ? 45 : 32
        );
        errors.push(`stock:queued=${queuedNow}<${PUBLIC_OWNER_LEADS_MIN_QUEUED} → extract↑${extractLimit}`);
      }
    } catch {
      /* ignore */
    }
  }

  const extract = await processPendingSources(extractLimit, dryRun);
  errors.push(...extract.errors);

  const queued = await queueNewLeads(
    Math.max(budget, extractLimit, PUBLIC_OWNER_LEADS_MIN_QUEUED),
    dryRun
  );

  // Prepare: forzar budget 0 (nunca enviar en esta oleada)
  const sendBudget = wave === 'prepare' ? 0 : budget;

  let sent = 0;
  let failed = 0;
  let skippedSuppressed = 0;

  if (sendBudget > 0 && !dryRun) {
    // Prioridad: agencias (flow-c / audience) primero en oleadas tarde/noche
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
      LIMIT ${sendBudget}
    `;

    /** Dominios ya contactados (nunca 2 mails al mismo alojamiento). */
    const domainsSent = new Set<string>();
    const already = await sql`
      SELECT DISTINCT lower(domain) AS d
      FROM public_owner_leads
      WHERE status = 'sent' AND domain IS NOT NULL AND domain <> ''
    `;
    for (const r of already.rows) {
      const d = String(r.d || '').replace(/^www\./i, '');
      if (d) domainsSent.add(d);
    }
    /** Emails ya enviados (nunca reenviar el mismo). */
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

      if (domain && domainsSent.has(domain)) {
        skippedSuppressed++;
        await sql`
          UPDATE public_owner_leads
          SET status = 'skipped', updated_at = NOW(),
              notes = COALESCE(notes, '') || ' | skip:domain-already-sent'
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
      });
      if (result.ok) {
        sent++;
        emailsSent.add(email);
        if (domain) domainsSent.add(domain);
      } else {
        failed++;
        if (result.error) errors.push(`${email}: ${result.error}`);
      }
      await sleep(PUBLIC_OWNER_LEADS_MIN_DELAY_MS);
    }
  }

  // NORMA: tras CADA envío (o prepare), rellenar cola hasta ~150. Nunca a 0.
  let refillSummary: DailyOutreachResult['refill'];
  if (!dryRun) {
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
  }

  return {
    table_ready: true,
    dryRun,
    wave,
    dailyTarget: cap,
    sentTodayBefore,
    signupsTodayBefore,
    budget: sendBudget,
    sourcesProcessed: extract.processed,
    leadsDiscovered: extract.discovered,
    queued,
    sent,
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
