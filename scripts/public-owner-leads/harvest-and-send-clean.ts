#!/usr/bin/env npx tsx
/**
 * Cosecha emails reales (filtro estricto + 1/dominio) y envía hasta completar cupo del día.
 * No reenvía email ni dominio ya contactado.
 */
import { sql } from '../../src/lib/db';
import { isPlausiblePublicEmail, scoreEmailForSource, domainFromUrl, normalizeUrl } from '../../src/lib/public-owner-leads/emails';
import { extractPublicEmailsFromUrl } from '../../src/lib/public-owner-leads/extract-web';
import { sendTrackedOutreachLead } from '../../src/lib/public-owner-leads/send-tracked';
import { SEED_SPAIN_VACATION_URLS } from '../../src/lib/public-owner-leads/seed-spain-vacation-urls';
import {
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_MIN_DELAY_MS,
} from '../../src/lib/public-owner-leads/constants';
import { sleep } from '../../src/lib/public-owner-leads/fetch-html';
import { hostSuggestsNonVacation } from '../../src/lib/public-owner-leads/spain-vacation-filter';
import { isBlockedOutreachHost } from '../../src/lib/public-owner-leads/blocked-hosts';

async function main() {
  const sentEmails = new Set<string>();
  const sentDomains = new Set<string>();

  const sentRows = await sql`
    SELECT lower(email) AS e, lower(regexp_replace(coalesce(domain,''), '^www\\.', '')) AS d
    FROM public_owner_leads WHERE status = 'sent'
  `;
  for (const r of sentRows.rows) {
    if (r.e) sentEmails.add(String(r.e));
    if (r.d) sentDomains.add(String(r.d));
  }

  const today = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'sent'
      AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
        AT TIME ZONE 'Europe/Madrid'
  `;
  let sentToday = Number(today.rows[0]?.n || 0);
  // Día completo = mañana 50 + tarde 50
  const dayCap = PUBLIC_OWNER_LEADS_DAILY_HARD_CAP;
  const budget = Math.max(0, dayCap - sentToday);
  console.log({ sentToday, budget, dayCap, alreadyDomains: sentDomains.size });

  // Pending DB sources first (never scraped), then seeds
  // Solo semillas de alojamientos concretos (no pending de outbound/portales)
  const urls = [...SEED_SPAIN_VACATION_URLS];
  const seenHost = new Set<string>();
  const queue: string[] = [];
  for (const raw of urls) {
    const url = normalizeUrl(raw);
    const host = domainFromUrl(url);
    if (!host || seenHost.has(host) || sentDomains.has(host)) continue;
    if (isBlockedOutreachHost(url) || hostSuggestsNonVacation(url)) continue;
    // Evitar directorios genéricos “casasruralesen*” / provincia-portal
    if (
      /casasruralesen|turismo-rural\.com$|alojamientorural\.com$|campingsde|barcelonacampings|fedcamping|campingred/i.test(
        host
      )
    ) {
      continue;
    }
    seenHost.add(host);
    queue.push(url);
  }

  console.log('to probe', queue.length);
  let discovered = 0;
  let sent = 0;

  for (const url of queue) {
    if (sentToday + sent >= dayCap) break;
    const host = domainFromUrl(url);
    if (sentDomains.has(host)) continue;

    let leads;
    try {
      const r = await extractPublicEmailsFromUrl(url, 250);
      if (r.blocked || !r.leads.length) {
        await sql`
          UPDATE public_owner_lead_sources
          SET status = 'done', emails_found = 0, last_scraped_at = NOW(), updated_at = NOW(),
              last_error = ${r.error || 'no-email'}
          WHERE url = ${url}
        `.catch(() => null);
        continue;
      }
      leads = r.leads;
    } catch (e) {
      console.log('extract fail', url, e instanceof Error ? e.message : e);
      continue;
    }

    const best = leads
      .map((l) => ({ ...l, score: scoreEmailForSource(l.email, url) }))
      .filter((l) => l.score >= 0 && isPlausiblePublicEmail(l.email))
      .sort((a, b) => b.score - a.score)[0];

    if (!best) continue;
    if (sentEmails.has(best.email)) continue;

    discovered++;
    const ins = await sql`
      INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
      VALUES (
        ${best.email},
        ${host},
        ${url},
        'queued',
        ${`clean-harvest:${new Date().toISOString().slice(0, 10)}`},
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    let id = ins.rows[0]?.id ? String(ins.rows[0].id) : '';
    if (!id) {
      const ex = await sql`
        SELECT id, status FROM public_owner_leads WHERE email = ${best.email} LIMIT 1
      `;
      const st = String(ex.rows[0]?.status || '');
      if (!ex.rows[0] || st === 'sent' || st === 'bounced') continue;
      id = String(ex.rows[0].id);
      const q = await sql`
        UPDATE public_owner_leads
        SET status='queued', queued_at=NOW(), updated_at=NOW()
        WHERE id = ${id}::uuid AND status IN ('new','skipped','failed','queued')
        RETURNING id
      `;
      if (!q.rows[0]) continue;
    }

    const result = await sendTrackedOutreachLead({
      id,
      email: best.email,
      domain: host,
      source_url: url,
    });
    console.log(result.ok ? 'SENT' : 'FAIL', best.email, host, result.error || '');
    if (result.ok) {
      sent++;
      sentEmails.add(best.email);
      sentDomains.add(host);
      await sql`
        UPDATE public_owner_lead_sources
        SET status='done', emails_found=1, last_scraped_at=NOW(), updated_at=NOW(), last_error=NULL
        WHERE url = ${url}
      `.catch(() => null);
    }
    await sleep(PUBLIC_OWNER_LEADS_MIN_DELAY_MS);
  }

  console.log(JSON.stringify({ discovered, sent, sentTodayAfter: sentToday + sent }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
