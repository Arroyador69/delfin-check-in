/**
 * Tras cada oleada de envío: rellenar cola hasta MIN_QUEUED (~150).
 * Datos abiertos + semillas + extract. Nunca dejar recámara vacía.
 */

import { sql } from '@/lib/db';
import {
  PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN,
  PUBLIC_OWNER_LEADS_MIN_QUEUED,
} from './constants';
import {
  ensureSpainAgencySourceQueue,
  ensureSpainVacationSourceQueue,
  recycleEmptySources,
} from './ensure-source-queue';
import { importJcylOpenDataToQueue } from './import-opendata';
import { extractPublicEmailsFromUrl, normalizeUrl } from './extract-web';
import { sleep } from './fetch-html';
import {
  domainFromUrl,
  isPlausiblePublicEmail,
  scoreEmailForSource,
} from './emails';
import { isBlockedOutreachHost } from './blocked-hosts';
import { hostSuggestsNonVacation } from './spain-vacation-filter';

export type RefillResult = {
  target: number;
  queuedBefore: number;
  queuedAfter: number;
  opendataQueued: number;
  extracted: number;
  recycled: number;
  errors: string[];
};

async function countQueued(): Promise<number> {
  const r = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'queued' AND opted_out = false
  `;
  return Number(r.rows[0]?.n || 0);
}

async function promoteNewToQueued(limit: number): Promise<number> {
  const r = await sql`
    WITH cte AS (
      SELECT id FROM public_owner_leads
      WHERE status = 'new' AND opted_out = false
      ORDER BY created_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public_owner_leads p
    SET status = 'queued', queued_at = COALESCE(queued_at, NOW()), updated_at = NOW()
    FROM cte WHERE p.id = cte.id
    RETURNING p.id
  `;
  return r.rows.length;
}

/**
 * Rellena hasta `target` (default MIN_QUEUED=150). Idempotente.
 */
export async function refillQueuedStock(opts?: {
  target?: number;
  extractLimit?: number;
  opendataLimit?: number;
}): Promise<RefillResult> {
  const target = opts?.target ?? PUBLIC_OWNER_LEADS_MIN_QUEUED;
  const extractLimit = opts?.extractLimit ?? Math.max(PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN, 35);
  const opendataLimit = opts?.opendataLimit ?? 100;
  const errors: string[] = [];
  const queuedBefore = await countQueued();
  let opendataQueued = 0;
  let extracted = 0;
  let recycled = 0;

  if (queuedBefore >= target) {
    return {
      target,
      queuedBefore,
      queuedAfter: queuedBefore,
      opendataQueued: 0,
      extracted: 0,
      recycled: 0,
      errors: [],
    };
  }

  try {
    await ensureSpainVacationSourceQueue();
    await ensureSpainAgencySourceQueue();
    recycled = await recycleEmptySources(60);
  } catch (e) {
    errors.push(`seed:${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const need = target - (await countQueued());
    if (need > 0) {
      const od = await importJcylOpenDataToQueue({
        limit: Math.min(opendataLimit, Math.max(need, 40)),
      });
      opendataQueued = od.queued;
    }
  } catch (e) {
    errors.push(`opendata:${e instanceof Error ? e.message : String(e)}`);
  }

  // OSM soft (no tumbar)
  try {
    const { discoverOwnerSitesByPlace } = await import('./discover-by-place');
    const disc = await discoverOwnerSitesByPlace({
      maxPlaces: 5,
      maxCandidates: 25,
      delayMs: 300,
      deadlineMs: 45_000,
      waveOffset: Math.floor(Date.now() / 60_000) % 4,
    });
    for (const url of disc.candidateUrls) {
      await sql`
        INSERT INTO public_owner_lead_sources (url, status)
        VALUES (${url}, 'pending')
        ON CONFLICT (url) DO NOTHING
      `;
    }
    for (const row of disc.emailsFromOsm) {
      const host = String(row.website || '')
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0]
        .toLowerCase();
      if (!host) continue;
      await sql`
        INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
        VALUES (
          ${row.email},
          ${host},
          ${row.website},
          'queued',
          ${`refill-osm:${row.place}`},
          NOW()
        )
        ON CONFLICT (email) DO NOTHING
      `;
    }
  } catch (e) {
    errors.push(`osm:${e instanceof Error ? e.message : String(e)}`);
  }

  const pending = await sql`
    SELECT id, url FROM public_owner_lead_sources
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT ${extractLimit}
  `;

  const usedEmail = new Set<string>();
  const usedDomain = new Set<string>();
  const already = await sql`
    SELECT lower(email) AS e, lower(regexp_replace(coalesce(domain,''), '^www\\.', '')) AS d
    FROM public_owner_leads WHERE status IN ('sent', 'queued', 'new', 'bounced')
  `;
  for (const r of already.rows) {
    if (r.e) usedEmail.add(String(r.e));
    if (r.d) usedDomain.add(String(r.d));
  }

  for (const row of pending.rows) {
    if ((await countQueued()) >= target) break;
    const url = normalizeUrl(String(row.url || ''));
    if (!url || isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) {
      await sql`
        UPDATE public_owner_lead_sources
        SET status = 'blocked', last_scraped_at = NOW() WHERE id = ${row.id}::uuid
      `;
      continue;
    }
    try {
      const { leads, blocked, error } = await extractPublicEmailsFromUrl(url);
      if (blocked) {
        await sql`
          UPDATE public_owner_lead_sources
          SET status = 'blocked', last_error = ${error || 'blocked'}, last_scraped_at = NOW()
          WHERE id = ${row.id}::uuid
        `;
        continue;
      }
      let found = 0;
      for (const lead of leads) {
        const email = lead.email.toLowerCase();
        const domain = (lead.domain || domainFromUrl(lead.source_url) || '').replace(/^www\./, '');
        if (!isPlausiblePublicEmail(email) || scoreEmailForSource(email, lead.source_url) < 0) continue;
        if (usedEmail.has(email) || (domain && usedDomain.has(domain))) continue;
        const aud = lead.audience || 'owner';
        const note = `refill:${aud}:${new Date().toISOString().slice(0, 10)}`;
        const ins = await sql`
          INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
          VALUES (${email}, ${domain}, ${lead.source_url}, 'queued', ${note}, NOW())
          ON CONFLICT (email) DO NOTHING
          RETURNING id
        `;
        if (ins.rows[0]) {
          found++;
          extracted++;
          usedEmail.add(email);
          if (domain) usedDomain.add(domain);
        }
      }
      await sql`
        UPDATE public_owner_lead_sources
        SET status = 'done', emails_found = ${found}, last_scraped_at = NOW(), updated_at = NOW()
        WHERE id = ${row.id}::uuid
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`extract:${msg.slice(0, 80)}`);
      await sql`
        UPDATE public_owner_lead_sources
        SET status = 'failed', last_error = ${msg.slice(0, 400)}, last_scraped_at = NOW()
        WHERE id = ${row.id}::uuid
      `;
    }
    await sleep(350);
  }

  await promoteNewToQueued(target);

  // Segunda pasada opendata si aún falta
  const mid = await countQueued();
  if (mid < target) {
    try {
      const od2 = await importJcylOpenDataToQueue({ limit: target - mid + 20 });
      opendataQueued += od2.queued;
    } catch (e) {
      errors.push(`opendata2:${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const queuedAfter = await countQueued();
  return {
    target,
    queuedBefore,
    queuedAfter,
    opendataQueued,
    extracted,
    recycled,
    errors: errors.slice(0, 12),
  };
}
