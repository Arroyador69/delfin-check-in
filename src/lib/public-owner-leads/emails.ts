/** Extracción y filtrado de emails públicos desde HTML. */

const EMAIL_RE =
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const MAILTO_RE = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;

/** Dominios / patrones que no son contacto comercial real. */
const BLOCKLIST_PATTERNS = [
  /sentry\.io$/i,
  /wixpress\.com$/i,
  /example\.(com|org|net)$/i,
  /test\.(com|org)$/i,
  /localhost$/i,
  /email\.com$/i,
  /domain\.com$/i,
  /yourdomain/i,
  /noreply@/i,
  /no-reply@/i,
  /donotreply@/i,
  /mailer-daemon@/i,
  /postmaster@/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.gif$/i,
  /\.svg$/i,
  /\.webp$/i,
  /@\d+\.\d+\.\d+\.\d+$/i,
];

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/^mailto:/i, '');
}

export function isPlausiblePublicEmail(email: string): boolean {
  const e = normalizeEmail(email);
  if (!e.includes('@') || e.length < 6 || e.length > 254) return false;
  if (BLOCKLIST_PATTERNS.some((re) => re.test(e))) return false;
  const [local, domain] = e.split('@');
  if (!local || !domain || !domain.includes('.')) return false;
  if (local.length < 1) return false;
  return true;
}

export function extractEmailsFromHtml(html: string): string[] {
  const found = new Set<string>();

  for (const m of html.matchAll(MAILTO_RE)) {
    const e = normalizeEmail(m[1] || '');
    if (isPlausiblePublicEmail(e)) found.add(e);
  }

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  for (const m of stripped.matchAll(EMAIL_RE)) {
    const e = normalizeEmail(m[0] || '');
    if (isPlausiblePublicEmail(e)) found.add(e);
  }

  return [...found];
}

export function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

export function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return t;
  if (!/^https?:\/\//i.test(t)) return `https://${t}`;
  return t;
}
