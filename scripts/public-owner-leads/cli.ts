#!/usr/bin/env npx tsx
/**
 * CLI pipeline legal de leads (emails públicos en web propia).
 * Prohibido: LinkedIn / IG / Airbnb / Booking / WhatsApp frío.
 *
 * Uso: ver docs/growth/PUBLIC_LEADS_PIPELINE.md
 */

import fs from 'fs';
import path from 'path';

import { isBlockedOutreachHost, assertAllowedOutreachUrl } from './lib/blocked-hosts';
import {
  domainFromUrl,
  extractEmailsFromHtml,
  normalizeUrl,
} from './lib/emails';
import { buildOutreachOptOutUrl } from './lib/optout';
import { contactCandidateUrls, fetchHtml, sleep } from './lib/fetch';
import { sendOutreachMail } from './lib/send-smtp';
import {
  defaultLeadsPath,
  emptyLead,
  loadLeads,
  readUrlList,
  saveLeads,
  upsertLead,
} from './lib/store';
import { buildColdOutreachEmail } from './lib/template';

const DEFAULT_DAILY = 25;
const MAX_DAILY = 40;
const MIN_DELAY_MS = 1500;

function loadEnvFiles(): void {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function argValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  return argv[i + 1];
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function clampLimit(raw: string | undefined, fallback = DEFAULT_DAILY): number {
  const n = Math.floor(Number(raw ?? fallback));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(MAX_DAILY, n);
}

function usage(): void {
  console.log(`
Pipeline legal public-owner-leads

  extract  --input <urls.csv> [--out leads.csv] [--delay-ms 1500]
  status   [--file leads.csv]
  queue    [--limit 25] [--file leads.csv]
  send     [--limit 25] [--dry-run] [--file leads.csv]
  optout   --email dueño@ejemplo.com [--file leads.csv]

Límite diario hard: ${MAX_DAILY}. Default cola/envío: ${DEFAULT_DAILY}.
Prohibido scrape LinkedIn / IG / Airbnb / Booking / WhatsApp.
Docs: docs/growth/PUBLIC_LEADS_PIPELINE.md
`);
}

async function cmdExtract(argv: string[]): Promise<void> {
  const input = argValue(argv, '--input');
  if (!input) throw new Error('Falta --input <urls.csv>');
  const out = argValue(argv, '--out') || defaultLeadsPath();
  const delayMs = Math.max(MIN_DELAY_MS, Number(argValue(argv, '--delay-ms') || MIN_DELAY_MS));

  const urls = readUrlList(input).map(normalizeUrl).filter(Boolean);
  if (!urls.length) throw new Error('No hay URLs en el CSV');

  let leads = loadLeads(out);
  let added = 0;
  let skippedBlocked = 0;

  for (const url of urls) {
    if (isBlockedOutreachHost(url)) {
      console.warn(`[skip-blocked] ${url}`);
      skippedBlocked++;
      continue;
    }

    const candidates = contactCandidateUrls(url);
    const emailsFound = new Set<string>();
    let sourceForEmail = url;

    for (const candidate of candidates) {
      if (isBlockedOutreachHost(candidate)) continue;
      console.log(`[fetch] ${candidate}`);
      const res = await fetchHtml(candidate);
      await sleep(delayMs);
      if (!res.html) continue;
      const emails = extractEmailsFromHtml(res.html);
      for (const e of emails) {
        emailsFound.add(e);
        sourceForEmail = res.finalUrl || candidate;
      }
      if (emailsFound.size > 0 && candidate !== url) break;
    }

    if (!emailsFound.size) {
      console.log(`[no-email] ${url}`);
      continue;
    }

    for (const email of emailsFound) {
      const before = leads.length;
      leads = upsertLead(
        leads,
        emptyLead({
          email,
          domain: domainFromUrl(sourceForEmail) || domainFromUrl(url),
          source_url: sourceForEmail,
          status: 'new',
          notes: `extract:${new Date().toISOString().slice(0, 10)}`,
        })
      );
      if (leads.length > before) added++;
      else console.log(`[dup] ${email}`);
    }
  }

  saveLeads(leads, out);
  console.log(
    JSON.stringify(
      {
        ok: true,
        urls: urls.length,
        skippedBlocked,
        totalLeads: leads.length,
        newlyAddedOrSeen: added,
        out,
      },
      null,
      2
    )
  );
}

function cmdStatus(argv: string[]): void {
  const file = argValue(argv, '--file') || defaultLeadsPath();
  const leads = loadLeads(file);
  const counts: Record<string, number> = {};
  let opted = 0;
  for (const l of leads) {
    counts[l.status] = (counts[l.status] || 0) + 1;
    if (l.opted_out) opted++;
  }
  const today = new Date().toISOString().slice(0, 10);
  const sentToday = leads.filter(
    (l) => l.status === 'sent' && l.sent_at.startsWith(today)
  ).length;
  console.log(
    JSON.stringify(
      { file, total: leads.length, opted_out: opted, byStatus: counts, sentToday, dailyCap: MAX_DAILY },
      null,
      2
    )
  );
}

function cmdQueue(argv: string[]): void {
  const file = argValue(argv, '--file') || defaultLeadsPath();
  const limit = clampLimit(argValue(argv, '--limit'));
  const leads = loadLeads(file);
  const now = new Date().toISOString();
  let n = 0;
  for (const l of leads) {
    if (n >= limit) break;
    if (l.opted_out) continue;
    if (l.status !== 'new') continue;
    l.status = 'queued';
    l.queued_at = now;
    l.updated_at = now;
    n++;
  }
  saveLeads(leads, file);
  console.log(JSON.stringify({ ok: true, queued: n, limit, file }, null, 2));
}

async function cmdSend(argv: string[]): Promise<void> {
  const file = argValue(argv, '--file') || defaultLeadsPath();
  const limit = clampLimit(argValue(argv, '--limit'));
  const dryRun = hasFlag(argv, '--dry-run');
  const leads = loadLeads(file);
  const today = new Date().toISOString().slice(0, 10);
  const sentToday = leads.filter(
    (l) => l.status === 'sent' && l.sent_at.startsWith(today)
  ).length;
  const remaining = Math.max(0, MAX_DAILY - sentToday);
  const budget = Math.min(limit, remaining);

  if (budget <= 0) {
    console.log(
      JSON.stringify({
        ok: false,
        error: `Límite diario alcanzado (${MAX_DAILY}). Enviados hoy: ${sentToday}`,
      })
    );
    return;
  }

  const queue = leads.filter((l) => !l.opted_out && l.status === 'queued').slice(0, budget);
  let sent = 0;
  let failed = 0;

  for (const lead of queue) {
    try {
      assertAllowedOutreachUrl(lead.source_url || lead.domain);
    } catch (e: any) {
      lead.status = 'skipped';
      lead.notes = `${lead.notes} | blocked-host`.slice(0, 500);
      lead.updated_at = new Date().toISOString();
      failed++;
      console.warn(`[blocked] ${lead.email}: ${e.message}`);
      continue;
    }

    const optOutUrl = buildOutreachOptOutUrl(lead.email, 'es');
    const mail = buildColdOutreachEmail({
      toEmail: lead.email,
      domain: lead.domain,
      sourceUrl: lead.source_url,
      optOutUrl,
    });

    if (dryRun) {
      console.log(`[dry-run] → ${lead.email}`);
      console.log(`  subject: ${mail.subject}`);
      console.log(`  opt-out: ${optOutUrl}`);
      sent++;
      continue;
    }

    try {
      const info = await sendOutreachMail({
        to: lead.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        optOutUrl,
      });
      lead.status = 'sent';
      lead.sent_at = new Date().toISOString();
      lead.updated_at = lead.sent_at;
      lead.notes = `${lead.notes} | msgid:${info.messageId || ''}`.slice(0, 500);
      sent++;
      console.log(`[sent] ${lead.email}`);
      await sleep(MIN_DELAY_MS);
    } catch (e: any) {
      lead.status = 'skipped';
      lead.updated_at = new Date().toISOString();
      lead.notes = `${lead.notes} | err:${String(e?.message || e).slice(0, 120)}`.slice(0, 500);
      failed++;
      console.error(`[fail] ${lead.email}:`, e?.message || e);
    }
  }

  if (!dryRun) saveLeads(leads, file);
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        attempted: queue.length,
        sent,
        failed,
        sentTodayBefore: sentToday,
        dailyCap: MAX_DAILY,
        file,
      },
      null,
      2
    )
  );
}

function cmdOptout(argv: string[]): void {
  const email = (argValue(argv, '--email') || '').trim().toLowerCase();
  if (!email) throw new Error('Falta --email');
  const file = argValue(argv, '--file') || defaultLeadsPath();
  const leads = loadLeads(file);
  const now = new Date().toISOString();
  let hit = false;
  for (const l of leads) {
    if (l.email === email) {
      l.opted_out = true;
      if (l.status === 'queued') l.status = 'skipped';
      l.updated_at = now;
      l.notes = `${l.notes} | optout-cli`.slice(0, 500);
      hit = true;
    }
  }
  if (!hit) {
    leads.push(
      emptyLead({
        email,
        source_url: 'manual-optout',
        domain: email.split('@')[1] || '',
        status: 'skipped',
        opted_out: true,
        notes: 'optout-cli-only',
      })
    );
  }
  saveLeads(leads, file);
  console.log(JSON.stringify({ ok: true, email, file, existed: hit }, null, 2));
}

async function main(): Promise<void> {
  loadEnvFiles();
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (!cmd || cmd === 'help' || cmd === '--help') {
    usage();
    return;
  }
  switch (cmd) {
    case 'extract':
      await cmdExtract(argv);
      break;
    case 'status':
      cmdStatus(argv);
      break;
    case 'queue':
      cmdQueue(argv);
      break;
    case 'send':
      await cmdSend(argv);
      break;
    case 'optout':
      cmdOptout(argv);
      break;
    default:
      usage();
      throw new Error(`Comando desconocido: ${cmd}`);
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
