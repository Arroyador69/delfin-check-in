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

/** Cloudflare Email Protection (data-cfemail). */
function decodeCfEmail(hex: string): string | null {
  try {
    const r = parseInt(hex.slice(0, 2), 16);
    let out = '';
    for (let i = 2; i < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ r);
    }
    return out;
  } catch {
    return null;
  }
}

export function extractEmailsFromHtml(html: string): string[] {
  const found = new Set<string>();

  for (const m of html.matchAll(MAILTO_RE)) {
    const e = normalizeEmail(m[1] || '');
    if (isPlausiblePublicEmail(e)) found.add(e);
  }

  for (const m of html.matchAll(/data-cfemail=["']([a-f0-9]+)["']/gi)) {
    const decoded = decodeCfEmail(m[1] || '');
    if (decoded && isPlausiblePublicEmail(decoded)) found.add(normalizeEmail(decoded));
  }

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  // info [at] dominio.com / info(at)dominio.com
  const obfuscated = stripped.replace(
    /([a-z0-9._%+\-]+)\s*(?:\[?\s*at\s*\]?|\(at\)|@)\s*([a-z0-9.\-]+)\s*(?:\[?\s*dot\s*\]?|\(dot\)|\.)\s*([a-z]{2,})/gi,
    '$1@$2.$3'
  );

  for (const m of obfuscated.matchAll(EMAIL_RE)) {
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
