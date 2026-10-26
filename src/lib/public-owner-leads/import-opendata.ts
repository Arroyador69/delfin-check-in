/**
 * Importa leads desde datos abiertos ES (GitHub / CSV) → queued.
 * No envía mails. CC-BY / datos oficiales.
 */

import { sql } from '@/lib/db';
import {
  domainFromUrl,
  isPlausiblePublicEmail,
  normalizeEmail,
  normalizeUrl,
  scoreEmailForSource,
} from './emails';
import { isBlockedOutreachHost } from './blocked-hosts';

export const JCYL_TURISMO_RURAL_CSV =
  'https://raw.githubusercontent.com/oeg-upm/CJCyL/master/data/1284211842462.csv';

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === ';' && !inQ) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseSemicolonCsv(raw: string): Array<Record<string, string>> {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) =>
    h.replace(/^"|"$/g, '').trim().toLowerCase()
  );
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] || '').replace(/^"|"$/g, '').trim();
    });
    rows.push(obj);
  }
  return rows;
}

function pickEmail(row: Record<string, string>): string {
  for (const k of Object.keys(row)) {
    if (/email|e-mail|correo/i.test(k) && row[k]) {
      const m = row[k]!.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (m) return normalizeEmail(m[0]!);
    }
  }
  return '';
}

function pickWeb(row: Record<string, string>): string {
  for (const k of Object.keys(row)) {
    if (/^web$|website|url/i.test(k) && row[k]) {
      let w = row[k]!.split(/\s+/)[0] || '';
      w = w.replace(/,/g, '');
      if (!w) continue;
      if (!/^https?:\/\//i.test(w)) w = `https://${w}`;
      return normalizeUrl(w) || '';
    }
  }
  return '';
}

function pickProvince(row: Record<string, string>): string {
  for (const k of Object.keys(row)) {
    if (/provincia/i.test(k) && row[k]) return row[k]!;
  }
  return '';
}

function isJunkEmail(email: string): boolean {
  return (
    /@jcyl\.es$/i.test(email) ||
    /@gob\.es$/i.test(email) ||
    /@navarra\.es$/i.test(email) ||
    /noreply|no-reply|ejemplo|example\.com/i.test(email)
  );
}

export async function importJcylOpenDataToQueue(opts?: {
  limit?: number;
  csvText?: string;
}): Promise<{
  queued: number;
  skipped: number;
  queuedTotal: number;
  source: string;
}> {
  const limit = opts?.limit ?? 80;
  let text = opts?.csvText;
  if (!text) {
    const res = await fetch(JCYL_TURISMO_RURAL_CSV, {
      headers: { 'User-Agent': 'DelfinCheckInBot/1.0 (+https://delfincheckin.com)' },
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new Error(`opendata fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    text = buf.toString('latin1');
  }

  const rows = parseSemicolonCsv(text);
  const usedEmail = new Set<string>();
  const usedDomain = new Set<string>();
  const existing = await sql`
    SELECT lower(email) AS e, lower(regexp_replace(coalesce(domain,''), '^www\\.', '')) AS d
    FROM public_owner_leads
    WHERE status IN ('sent', 'queued', 'new', 'bounced', 'skipped')
  `;
  for (const r of existing.rows) {
    if (r.e) usedEmail.add(String(r.e));
    if (r.d) usedDomain.add(String(r.d));
  }

  const byProv = new Map<string, typeof rows>();
  for (const row of rows) {
    const p = pickProvince(row) || 'sin-provincia';
    if (!byProv.has(p)) byProv.set(p, []);
    byProv.get(p)!.push(row);
  }
  const provinces = [...byProv.keys()].sort();
  const day = Math.floor(Date.now() / 86_400_000);
  const startProv = day % Math.max(provinces.length, 1);
  const ordered: typeof rows = [];
  for (let i = 0; i < provinces.length; i++) {
    ordered.push(...(byProv.get(provinces[(startProv + i) % provinces.length]!) || []));
  }

  let queued = 0;
  let skipped = 0;
  for (const row of ordered) {
    if (queued >= limit) break;
    const email = pickEmail(row);
    if (!email || !isPlausiblePublicEmail(email) || isJunkEmail(email) || usedEmail.has(email)) {
      skipped++;
      continue;
    }
    let web = pickWeb(row);
    if (web && isBlockedOutreachHost(web)) {
      skipped++;
      continue;
    }
    if (!web) {
      const host = email.split('@')[1];
      if (!host) {
        skipped++;
        continue;
      }
      web = `https://${host}`;
    }
    const domain = (domainFromUrl(web) || email.split('@')[1] || '').replace(/^www\./, '');
    if (!domain || usedDomain.has(domain) || scoreEmailForSource(email, web) < 0) {
      skipped++;
      continue;
    }
    const prov = pickProvince(row) || 'ES';
    const note = `opendata:jcyl:${prov}:${new Date().toISOString().slice(0, 10)}`;
    const ins = await sql`
      INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
      VALUES (${email}, ${domain}, ${web}, 'queued', ${note}, NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    if (!ins.rows[0]) {
      skipped++;
      continue;
    }
    usedEmail.add(email);
    usedDomain.add(domain);
    queued++;
  }

  const stock = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads WHERE status = 'queued' AND opted_out = false
  `;
  return {
    queued,
    skipped,
    queuedTotal: Number(stock.rows[0]?.n || 0),
    source: 'github.com/oeg-upm/CJCyL',
  };
}
