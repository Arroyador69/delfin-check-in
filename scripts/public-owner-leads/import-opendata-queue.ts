#!/usr/bin/env npx tsx
/**
 * Importa emails de datos abiertos ES → cola queued. NUNCA envía.
 *
 * Fuentes OS:
 *  - GitHub oeg-upm/CJCyL turismo rural Castilla y León
 *  - CSV local opcional --file
 *
 *   npx tsx scripts/public-owner-leads/import-opendata-queue.ts --limit 150
 *   npx tsx scripts/public-owner-leads/import-opendata-queue.ts --file /tmp/jcyl.csv --limit 200
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function loadEnvFile(name: string): void {
  const p = path.join(process.cwd(), name);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const eq = t.indexOf('=');
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
loadEnvFile('.env.outreach.local');
loadEnvFile('.env.local');

import { sql } from '../../src/lib/db';
import {
  domainFromUrl,
  isPlausiblePublicEmail,
  normalizeEmail,
  normalizeUrl,
  scoreEmailForSource,
} from '../../src/lib/public-owner-leads/emails';
import { isBlockedOutreachHost } from '../../src/lib/public-owner-leads/blocked-hosts';

const JCYL_RAW =
  'https://raw.githubusercontent.com/oeg-upm/CJCyL/master/data/1284211842462.csv';

function argNum(name: string, def: number): number {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) {
    const n = Number(process.argv[i + 1]);
    if (Number.isFinite(n)) return n;
  }
  return def;
}

function argVal(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
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
    if (/^web$|website|url|página/i.test(k) && row[k]) {
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

async function main() {
  const limit = argNum('--limit', 150);
  let file = argVal('--file');

  if (!file) {
    file = '/tmp/jcyl-turismo-rural.csv';
    if (!fs.existsSync(file)) {
      console.log('[opendata] downloading JCyL CSV…');
      execSync(`curl -sSL -m 90 -A 'DelfinCheckInBot/1.0' -o ${file} '${JCYL_RAW}'`, {
        stdio: 'inherit',
      });
    }
  }

  const buf = fs.readFileSync(file);
  let text = buf.toString('utf8');
  if (text.includes('Direcci') === false && text.includes('Ã')) {
    text = buf.toString('latin1');
  }
  // Prefer latin1 for this dataset (often windows-1252)
  if (!/Email/i.test(text.split('\n')[0] || '')) {
    text = buf.toString('latin1');
  }

  const rows = parseSemicolonCsv(text);
  console.log('[opendata] rows', rows.length, 'file', file);

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

  // Rotar por provincia: ordenar provincias distintas primero
  const byProv = new Map<string, typeof rows>();
  for (const row of rows) {
    const p = pickProvince(row) || 'sin-provincia';
    if (!byProv.has(p)) byProv.set(p, []);
    byProv.get(p)!.push(row);
  }
  const provinces = [...byProv.keys()].sort();
  const day = Math.floor(Date.now() / 86_400_000);
  const startProv = day % Math.max(provinces.length, 1);
  const orderedRows: typeof rows = [];
  for (let i = 0; i < provinces.length; i++) {
    const p = provinces[(startProv + i) % provinces.length]!;
    orderedRows.push(...(byProv.get(p) || []));
  }

  let queued = 0;
  let skipped = 0;
  const sample: string[] = [];

  for (const row of orderedRows) {
    if (queued >= limit) break;
    const email = pickEmail(row);
    if (!email || !isPlausiblePublicEmail(email) || isJunkEmail(email)) {
      skipped++;
      continue;
    }
    if (usedEmail.has(email)) {
      skipped++;
      continue;
    }

    let web = pickWeb(row);
    if (web && isBlockedOutreachHost(web)) {
      skipped++;
      continue;
    }
    if (!web) web = `https://opendata.local/${email.split('@')[1] || 'unknown'}`;

    const domain =
      domainFromUrl(web) ||
      email.split('@')[1]?.toLowerCase() ||
      '';
    if (!domain || usedDomain.has(domain.replace(/^www\./, ''))) {
      skipped++;
      continue;
    }
    if (scoreEmailForSource(email, web) < 0) {
      skipped++;
      continue;
    }

    const prov = pickProvince(row) || 'ES';
    const note = `opendata:jcyl:${prov}:${new Date().toISOString().slice(0, 10)}`;
    const ins = await sql`
      INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
      VALUES (${email}, ${domain.replace(/^www\./, '')}, ${web}, 'queued', ${note}, NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    if (!ins.rows[0]) {
      skipped++;
      continue;
    }
    usedEmail.add(email);
    usedDomain.add(domain.replace(/^www\./, ''));
    queued++;
    if (sample.length < 12) sample.push(`${email} · ${prov}`);
  }

  const stock = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads WHERE status = 'queued' AND opted_out = false
  `;

  console.log(
    JSON.stringify(
      {
        mode: 'opendata_queue_no_send',
        source: 'github.com/oeg-upm/CJCyL (turismo rural CyL)',
        queuedThisRun: queued,
        skipped,
        queuedTotal: stock.rows[0]?.n,
        sample,
        note: 'Listos para oleadas cron. No se ha enviado nada.',
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
