/**
 * Descubrimiento continuo desde datos abiertos ES (varias CCAA).
 * No envía mails: encola leads y/o webs pendientes para extract.
 *
 * Fuentes:
 * - JCyL turismo rural (Castilla y León)
 * - GVA casas rurales (Comunitat Valenciana)
 * Ampliar aquí cuando haya más CSV oficiales con email/web.
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

export const OPENDATA_SOURCES = {
  jcyl: {
    id: 'jcyl',
    label: 'Castilla y León · turismo rural',
    url: 'https://raw.githubusercontent.com/oeg-upm/CJCyL/master/data/1284211842462.csv',
    sep: ';' as const,
    encoding: 'latin1' as const,
  },
  gva: {
    id: 'gva',
    label: 'Comunitat Valenciana · casas rurales',
    url: 'https://dadesobertes.gva.es/dataset/981cda16-b6a5-428e-920a-729cb153f9b8/resource/6b31800d-f2e8-4e99-ad4d-913aa71ad1dc/download/lista-de-casas-rurales.csv',
    sep: ';' as const,
    encoding: 'utf8' as const,
  },
  gva_hoteles: {
    id: 'gva_hoteles',
    label: 'Comunitat Valenciana · hoteles',
    url: 'https://dadesobertes.gva.es/dataset/247d0314-ecb0-4d25-a0f3-bd3d977fc911/resource/14c4f098-0d26-4b8b-aa7d-9c670632748a/download/listarthoteles_20260317.csv',
    sep: ';' as const,
    encoding: 'utf8' as const,
  },
  gva_campings: {
    id: 'gva_campings',
    label: 'Comunitat Valenciana · campings',
    url: 'https://dadesobertes.gva.es/dataset/2d606447-e418-49fd-94bd-aa87ffe849a0/resource/2ddaf823-5da4-4459-aa57-5bfe9f9eb474/download/listartcampings_20241229.csv',
    sep: ';' as const,
    encoding: 'utf8' as const,
  },
  gva_albergues: {
    id: 'gva_albergues',
    label: 'Comunitat Valenciana · albergues',
    url: 'https://dadesobertes.gva.es/dataset/7b1766e8-cd5a-41fd-8867-825b0d6a74ce/resource/2ccc33a9-0e63-4bcd-a3af-f5b94c5787d0/download/lista-de-albergues.csv',
    sep: ';' as const,
    encoding: 'utf8' as const,
  },
} as const;

export type OpenDataSourceId = keyof typeof OPENDATA_SOURCES;

export type OpenDataImportResult = {
  source: string;
  queued: number;
  sourcesQueued: number;
  skipped: number;
  queuedTotal: number;
};

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === sep && !inQ) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsv(
  raw: string,
  sep: string
): Array<Record<string, string>> {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!, sep).map((h) =>
    h.replace(/^"|"$/g, '').trim().toLowerCase()
  );
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!, sep);
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
      const m = row[k]!.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      );
      if (m) return normalizeEmail(m[0]!);
    }
  }
  return '';
}

function pickWeb(row: Record<string, string>): string {
  for (const k of Object.keys(row)) {
    if (/^web$|website|url|página|pagina/i.test(k) && row[k]) {
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
    /@gva\.es$/i.test(email) ||
    /noreply|no-reply|ejemplo|example\.com/i.test(email)
  );
}

/**
 * Score permisivo para registros oficiales: acepta correo personal
 * (gmail/live/ono…) si hay web de alojamiento en el mismo registro.
 */
export function scoreOpenDataEmail(email: string, web: string): number {
  const base = scoreEmailForSource(email, web);
  if (base >= 0) return base;
  if (!isPlausiblePublicEmail(email) || isJunkEmail(email)) return -1;
  // Dueños rurales a menudo usan gmail/hotmail/live/ISP con web propia en el registro
  const personalOk =
    /@(gmail|hotmail|outlook|yahoo|icloud|live|ono|telefonica|movistar|orange|yahoo|protonmail|proton)\./i.test(
      email
    );
  if (personalOk && web && !isBlockedOutreachHost(web)) return 3;
  return -1;
}

async function loadUsedSets(): Promise<{
  usedEmail: Set<string>;
  usedDomain: Set<string>;
}> {
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
  return { usedEmail, usedDomain };
}

async function fetchCsvText(
  url: string,
  encoding: 'utf8' | 'latin1'
): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'DelfinCheckInPublicLeadsBot/1.0 (+https://delfincheckin.com)',
      Accept: 'text/csv,*/*',
    },
    signal: AbortSignal.timeout(60_000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`opendata fetch ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return encoding === 'latin1' ? buf.toString('latin1') : buf.toString('utf8');
}

/**
 * Importa un CSV de datos abiertos → queued + webs a sources pending.
 */
export async function importOpenDataSource(opts: {
  sourceId: OpenDataSourceId;
  limit?: number;
  /** También encolar webs sin email usable para scrapear. */
  enqueueWebsites?: boolean;
  websiteLimit?: number;
}): Promise<OpenDataImportResult> {
  const meta = OPENDATA_SOURCES[opts.sourceId];
  const limit = opts.limit ?? 120;
  const enqueueWebsites = opts.enqueueWebsites !== false;
  const websiteLimit = opts.websiteLimit ?? Math.max(80, limit);
  const text = await fetchCsvText(meta.url, meta.encoding);
  const rows = parseCsv(text, meta.sep);
  const { usedEmail, usedDomain } = await loadUsedSets();

  const day = Math.floor(Date.now() / 86_400_000);
  const start = (day * 17) % Math.max(rows.length, 1);
  const ordered: typeof rows = [];
  for (let i = 0; i < rows.length; i++) {
    ordered.push(rows[(start + i) % rows.length]!);
  }

  let queued = 0;
  let sourcesQueued = 0;
  let skipped = 0;

  for (const row of ordered) {
    if (queued >= limit && (!enqueueWebsites || sourcesQueued >= websiteLimit)) {
      break;
    }

    const email = pickEmail(row);
    let web = pickWeb(row);
    if (web && isBlockedOutreachHost(web)) {
      skipped++;
      continue;
    }

    const prov = pickProvince(row) || meta.id.toUpperCase();
    const note = `opendata:${meta.id}:${prov}:${new Date().toISOString().slice(0, 10)}`;

    let domain = '';
    if (web) {
      domain = (domainFromUrl(web) || '').replace(/^www\./, '');
    }

    const canQueueEmail =
      queued < limit &&
      email &&
      isPlausiblePublicEmail(email) &&
      !isJunkEmail(email) &&
      !usedEmail.has(email) &&
      scoreOpenDataEmail(email, web || `https://${email.split('@')[1]}`) >= 0;

    if (canQueueEmail) {
      if (!web) {
        const host = email.split('@')[1];
        if (!host) {
          skipped++;
          continue;
        }
        web = `https://${host}`;
        domain = host.replace(/^www\./, '');
      }
      if (!domain) {
        skipped++;
      } else {
        const ins = await sql`
          INSERT INTO public_owner_leads (email, domain, source_url, status, notes, queued_at)
          VALUES (${email}, ${domain}, ${web}, 'queued', ${note}, NOW())
          ON CONFLICT (email) DO NOTHING
          RETURNING id
        `;
        if (ins.rows[0]) {
          usedEmail.add(email);
          usedDomain.add(domain);
          queued++;
        } else {
          skipped++;
        }
      }
    } else {
      skipped++;
    }

    // Webs nuevas → pending extract (nunca dejar de buscar mails en webs públicas)
    if (
      enqueueWebsites &&
      sourcesQueued < websiteLimit &&
      web &&
      domain &&
      !usedDomain.has(domain) &&
      !isBlockedOutreachHost(web)
    ) {
      const src = await sql`
        INSERT INTO public_owner_lead_sources (url, status)
        VALUES (${web}, 'pending')
        ON CONFLICT (url) DO NOTHING
        RETURNING id
      `;
      if (src.rows[0]) sourcesQueued++;
    }
  }

  const stock = await sql`
    SELECT COUNT(*)::int AS n FROM public_owner_leads
    WHERE status = 'queued' AND opted_out = false
  `;

  return {
    source: meta.label,
    queued,
    sourcesQueued,
    skipped,
    queuedTotal: Number(stock.rows[0]?.n || 0),
  };
}

/** Importa todas las fuentes abiertas (rotación diaria implícita en cada una). */
export async function importAllOpenDataToQueue(opts?: {
  limitPerSource?: number;
  websiteLimitPerSource?: number;
}): Promise<{
  results: OpenDataImportResult[];
  queued: number;
  sourcesQueued: number;
}> {
  const limitPerSource = opts?.limitPerSource ?? 150;
  const websiteLimitPerSource = opts?.websiteLimitPerSource ?? 120;
  const results: OpenDataImportResult[] = [];
  let queued = 0;
  let sourcesQueued = 0;
  for (const id of Object.keys(OPENDATA_SOURCES) as OpenDataSourceId[]) {
    try {
      const r = await importOpenDataSource({
        sourceId: id,
        limit: limitPerSource,
        enqueueWebsites: true,
        websiteLimit: websiteLimitPerSource,
      });
      results.push(r);
      queued += r.queued;
      sourcesQueued += r.sourcesQueued;
    } catch (e) {
      results.push({
        source: OPENDATA_SOURCES[id].label,
        queued: 0,
        sourcesQueued: 0,
        skipped: 0,
        queuedTotal: 0,
      });
      console.warn(
        '[opendata-multi]',
        id,
        e instanceof Error ? e.message : String(e)
      );
    }
  }
  return { results, queued, sourcesQueued };
}
