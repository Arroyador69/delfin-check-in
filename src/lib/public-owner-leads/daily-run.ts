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
  PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN,
  PUBLIC_OWNER_LEADS_MIN_DELAY_MS,
  PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
} from './constants';
import { isPlausiblePublicEmail, scoreEmailForSource } from './emails';
import { extractPublicEmailsFromUrl, isBlockedOutreachHost, normalizeUrl } from './extract-web';
import { ensureSpainVacationSourceQueue } from './ensure-source-queue';
import { sendTrackedOutreachLead } from './send-tracked';
import { sleep } from './fetch-html';
import { hostSuggestsNonVacation } from './spain-vacation-filter';

export type OutreachWave = 'morning' | 'afternoon';

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
  errors: string[];
};

async function ensureTables(): Promise<boolean> {
  const meta = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
  return Boolean(meta.rows[0]?.reg);
}

/**
 * Tope del DÍA = mañana 50 + tarde 50 → HARD_CAP 100.
 * No usar DAILY_TARGET (50) aquí: si no, la oleada 15:00 se queda sin cupo.
 */
function dailyCap(): number {
  const raw = Number(
    process.env.PUBLIC_OWNER_LEADS_DAILY_CAP || PUBLIC_OWNER_LEADS_DAILY_HARD_CAP
  );
  if (!Number.isFinite(raw) || raw < 1) return PUBLIC_OWNER_LEADS_DAILY_HARD_CAP;
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
        const ins = await sql`
          INSERT INTO public_owner_leads (email, domain, source_url, status, notes)
          VALUES (
            ${lead.email},
            ${lead.domain},
            ${lead.source_url},
            'new',
            ${`extract:${new Date().toISOString().slice(0, 10)}`}
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

export async function runDailyPublicOwnerLeads(opts?: {
  dryRun?: boolean;
  maxSend?: number;
  extractLimit?: number;
  /** morning = ~09:00; afternoon = ~15:00 solo si altas < meta 20 */
  wave?: OutreachWave;
}): Promise<DailyOutreachResult> {
  const dryRun = Boolean(opts?.dryRun);
  const wave: OutreachWave = opts?.wave === 'afternoon' ? 'afternoon' : 'morning';
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

  // Tarde: solo si aún no llegamos a 20 altas; nunca reenvía (solo status queued/new)
  if (wave === 'afternoon' && signupsTodayBefore >= PUBLIC_OWNER_SIGNUPS_DAILY_GOAL) {
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
      errors: [],
    };
  }

  const waveMax =
    opts?.maxSend ??
    (wave === 'afternoon' ? PUBLIC_OWNER_LEADS_AFTERNOON_MAX : PUBLIC_OWNER_LEADS_DAILY_TARGET);
  const budget = Math.max(0, Math.min(cap - sentTodayBefore, waveMax));

  // Autonomía: rellena cola ES vacacional si pending bajo (sin pegar URLs a mano)
  if (!dryRun) {
    try {
      const seeded = await ensureSpainVacationSourceQueue();
      if (seeded.inserted > 0) {
        errors.push(`seed:+${seeded.inserted} (pending era ${seeded.pendingBefore})`);
      }
    } catch (e) {
      errors.push(`seed:${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const extract = await processPendingSources(
    opts?.extractLimit ?? PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN,
    dryRun
  );
  errors.push(...extract.errors);

  const queued = await queueNewLeads(Math.max(budget, PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN), dryRun);

  let sent = 0;
  let failed = 0;
  let skippedSuppressed = 0;

  if (budget > 0 && !dryRun) {
    const queue = await sql`
      SELECT id, email, domain, source_url
      FROM public_owner_leads
      WHERE status = 'queued' AND opted_out = false
      ORDER BY queued_at ASC NULLS LAST, created_at ASC
      LIMIT ${budget}
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

      const result = await sendTrackedOutreachLead({
        id: String(row.id),
        email,
        domain: String(row.domain || ''),
        source_url: String(row.source_url || ''),
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

  // Recámara para la siguiente oleada / mañana 09:00
  if (!dryRun) {
    try {
      await ensureSpainVacationSourceQueue();
    } catch {
      /* ignore */
    }
  }

  return {
    table_ready: true,
    dryRun,
    wave,
    dailyTarget: cap,
    sentTodayBefore,
    signupsTodayBefore,
    budget,
    sourcesProcessed: extract.processed,
    leadsDiscovered: extract.discovered,
    queued,
    sent,
    failed,
    skippedSuppressed,
    errors: errors.slice(0, 20),
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
