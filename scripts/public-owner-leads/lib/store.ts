import fs from 'fs';
import path from 'path';

export type LeadStatus = 'new' | 'queued' | 'sent' | 'skipped' | 'bounced' | 'replied';

export interface Lead {
  email: string;
  domain: string;
  source_url: string;
  status: LeadStatus;
  opted_out: boolean;
  created_at: string;
  updated_at: string;
  queued_at: string;
  sent_at: string;
  notes: string;
}

const HEADERS: (keyof Lead)[] = [
  'email',
  'domain',
  'source_url',
  'status',
  'opted_out',
  'created_at',
  'updated_at',
  'queued_at',
  'sent_at',
  'notes',
];

export function defaultLeadsPath(): string {
  return path.join(__dirname, '..', 'data', 'leads.csv');
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function emptyLead(partial: Partial<Lead> & Pick<Lead, 'email' | 'source_url'>): Lead {
  const now = new Date().toISOString();
  return {
    email: partial.email.trim().toLowerCase(),
    domain: partial.domain || '',
    source_url: partial.source_url,
    status: partial.status || 'new',
    opted_out: partial.opted_out ?? false,
    created_at: partial.created_at || now,
    updated_at: partial.updated_at || now,
    queued_at: partial.queued_at || '',
    sent_at: partial.sent_at || '',
    notes: partial.notes || '',
  };
}

export function loadLeads(filePath = defaultLeadsPath()): Lead[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  const header = parseCsvLine(lines[0] || '');
  const rows: Lead[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]?.trim()) continue;
    const cols = parseCsvLine(lines[i]);
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = cols[idx] ?? '';
    });
    rows.push(
      emptyLead({
        email: obj.email || '',
        domain: obj.domain || '',
        source_url: obj.source_url || '',
        status: (obj.status as LeadStatus) || 'new',
        opted_out: obj.opted_out === 'true' || obj.opted_out === '1',
        created_at: obj.created_at,
        updated_at: obj.updated_at,
        queued_at: obj.queued_at,
        sent_at: obj.sent_at,
        notes: obj.notes,
      })
    );
  }
  return rows;
}

export function saveLeads(leads: Lead[], filePath = defaultLeadsPath()): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const lines = [HEADERS.join(',')];
  for (const lead of leads) {
    lines.push(
      HEADERS.map((h) => {
        const v = lead[h];
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        return escapeCsv(String(v ?? ''));
      }).join(',')
    );
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

export function upsertLead(leads: Lead[], incoming: Lead): Lead[] {
  const idx = leads.findIndex((l) => l.email === incoming.email);
  if (idx === -1) {
    leads.push(incoming);
    return leads;
  }
  const prev = leads[idx];
  if (prev.opted_out) {
    // Nunca reactivar un opted_out por un re-scrape
    leads[idx] = {
      ...prev,
      source_url: prev.source_url || incoming.source_url,
      domain: prev.domain || incoming.domain,
      updated_at: new Date().toISOString(),
    };
    return leads;
  }
  leads[idx] = {
    ...prev,
    domain: incoming.domain || prev.domain,
    source_url: incoming.source_url || prev.source_url,
    notes: [prev.notes, incoming.notes].filter(Boolean).join(' | ').slice(0, 500),
    updated_at: new Date().toISOString(),
  };
  return leads;
}

export function readUrlList(inputPath: string): string[] {
  const raw = fs.readFileSync(inputPath, 'utf8').trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  const first = parseCsvLine(lines[0]);
  const hasHeader = first.some((c) => /^url$/i.test(c.trim()));
  const urls: string[] = [];
  const start = hasHeader ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const url = hasHeader
      ? cols[first.findIndex((c) => /^url$/i.test(c.trim()))] || cols[0]
      : cols[0];
    if (url?.trim()) urls.push(url.trim());
  }
  return urls;
}
