/** Extracción y filtrado de emails públicos desde HTML. */

const EMAIL_RE =
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,24}/g;

const MAILTO_RE = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,24})/gi;

/** TLDs plausibles para contacto ES/UE (no .css / .fa / fragmentos). */
const PLAUSIBLE_TLDS = new Set([
  'es',
  'com',
  'net',
  'org',
  'eu',
  'gal',
  'cat',
  'eus',
  'info',
  'biz',
  'online',
  'site',
  'travel',
  'hotel',
  'fr',
  'pt',
  'it',
  'de',
  'uk',
  'co',
]);

/** Extensiones / tokens que NUNCA son TLD de email real. */
const JUNK_TLDS = new Set([
  'css',
  'js',
  'mjs',
  'ts',
  'map',
  'fa',
  'mb',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  'ico',
  'php',
  'asp',
  'aspx',
  'html',
  'htm',
  'xml',
  'json',
  'pdf',
  'scss',
  'less',
  'base',
  'min',
  'src',
  'currentsrc',
  'imgstyles',
  'imgclassnames',
  'figurestyles',
  'figureclassnames',
  'overlaystyles',
  'overlayopened',
  'overlayenabled',
  'ariamodal',
  'arialabel',
  'roleattribute',
  'imagebuttontop',
  'imagebuttonright',
  'iscontentvisible',
  'iscontenthidden',
  'enlargedsrc',
  'sinner',
  'desayuno',
  'repetir',
  'ourense',
  'disfruta',
  'por',
  'antes',
  'el',
  'un',
  'the',
]);

/** Dominios / patrones que no son contacto comercial real. */
const BLOCKLIST_PATTERNS = [
  /sentry\.io$/i,
  /wixpress\.com$/i,
  /example\.(com|org|net)$/i,
  /ejemplo\.(com|es)$/i,
  /tuemail@/i,
  /tucorreo@/i,
  /gravatar\.com$/i,
  /grav@ar/i,
  /wordpress\.com$/i,
  /cookied@/i,
  /cookie@abase/i,
  /rankm@/i,
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
  /whatsapp\.com$/i,
  /wa\.me$/i,
  /gstatic\.com$/i,
  /gst@ic/i,
  /googleapis\.com$/i,
  /google\.com$/i,
  /facebook\.com$/i,
  /instagram\.com$/i,
  /wix\.com$/i,
  /^wp\.com$/i,
  /\.wp\.com$/i,
  /cloudflare\.com$/i,
  /schema\.org$/i,
  /w3\.org$/i,
  /\.gob\.es$/i,
  /rediris\.es$/i,
  /fedcamping\.com$/i,
  /campingred\.es$/i,
  /\.png$/i,
  /\.jpe?g$/i,
  /\.gif$/i,
  /\.svg$/i,
  /\.webp$/i,
  /\.css$/i,
  /\.js$/i,
  /\.php$/i,
  /\.min\./i,
  /@\d+\.\d+\.\d+\.\d+$/i,
  /whatsapp-image/i,
  /loc@ion\.href/i,
  /window\.loc/i,
];

/** Local-part o dominio que huele a CSS / iconos / assets / JS. */
const GARBAGE_LOCAL_OR_DOMAIN = [
  /^fa[-_]/i,
  /^formin/i,
  /^joinch/i,
  /^anim/i,
  /^e-anim/i,
  /^fonts?\./i,
  /^api\./i,
  /^chat\./i,
  /^www\./i,
  /^st@e\./i,
  /^st$/i,
  /^navig/i,
  /^module-style/i,
  /^m@erial/i,
  /^material/i,
  /^fl@/i,
  /^flat/i,
  /^ct-ultim/i,
  /^de-reveal/i,
  /^de-scroll/i,
  /^et-divi/i,
  /^icmwac/i,
  /^av@ar/i,
  /^online@tacks/i,
  /^muy@ento/i,
  /^y@enta/i,
  /^pl@a/i,
  /^mayor@/i,
  /^n@uraleza/i,
  /^inmedi/i,
  /^urlar/i,
  /^uraleza/i,
  /\.min$/i,
  /\.css$/i,
  /\.js$/i,
  /\.fa$/i,
  /\.mb$/i,
  /\.base$/i,
  /map-loc/i,
  /whatsapp/i,
  /gstatic/i,
  /cloudflare/i,
  /parallax/i,
  /gdpr/i,
  /daterange/i,
  /flatpickr/i,
  /iconic-font/i,
  /dynamic-tb/i,
  /^https?%/i,
  /^https?$/i,
];

const CONTACT_LOCALS = new Set([
  'info',
  'reserva',
  'reservas',
  'contacto',
  'contact',
  'hola',
  'booking',
  'admin',
  'correo',
  'mail',
  'email',
  'recepcion',
  'reception',
  'consultas',
  'general',
  'oficina',
  'hello',
  'owner',
  'propietario',
]);

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/^mailto:/i, '');
}

export function isPlausiblePublicEmail(email: string): boolean {
  const e = normalizeEmail(email);
  if (!e.includes('@') || e.length < 6 || e.length > 254) return false;
  if (e.includes('%') || e.includes('/') || e.includes(' ') || e.includes('\\')) return false;
  if (BLOCKLIST_PATTERNS.some((re) => re.test(e))) return false;

  const at = e.indexOf('@');
  if (at < 1 || e.indexOf('@', at + 1) !== -1) return false;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (!local || !domain || !domain.includes('.')) return false;
  if (local.length < 2 || local.length > 64) return false;
  if (!/^[a-z0-9._%+\-]+$/i.test(local)) return false;
  if (!/^[a-z0-9.\-]+$/i.test(domain)) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  // CSS/HTML rotos: www.algo@dominio, booking.avir@o.com, st@e.*
  if (/^www\./i.test(local) || /\.avir$/i.test(local) || /^booking\./i.test(local)) return false;
  if (/^st$/i.test(local) && /^e\./i.test(domain)) return false;

  const labels = domain.split('.');
  const tld = (labels[labels.length - 1] || '').toLowerCase();
  if (tld.length < 2 || tld.length > 12) return false;
  if (JUNK_TLDS.has(tld)) return false;
  if (!PLAUSIBLE_TLDS.has(tld)) return false;

  const sld = labels[labels.length - 2] || '';
  // Dominios basura tipo o.com / s.wp.com
  if (sld.length < 3 && !['co', 'com', 'org', 'net'].includes(sld)) return false;
  // Fragmentos JS tipo state.currentimage.alt
  if (labels.length > 3) return false;

  if (GARBAGE_LOCAL_OR_DOMAIN.some((re) => re.test(local) || re.test(domain))) return false;
  if (/\.$/.test(domain) || domain.includes('-.') || /-\.$/.test(domain)) return false;
  if (local.includes('@') || /^(e-)?anim/i.test(local)) return false;

  // Local demasiado corto salvo contactos típicos
  if (local.length < 3 && !CONTACT_LOCALS.has(local) && !/^(me|yo)$/i.test(local)) return false;

  // Local con demasiados puntos / guiones = CSS class
  if ((local.match(/\./g) || []).length >= 2) return false;
  if ((local.match(/-/g) || []).length >= 3) return false;

  return true;
}

/** Prioriza emails cuyo dominio coincide con la web (contacto real vs CSS). */
export function scoreEmailForSource(email: string, sourceUrlOrDomain: string): number {
  if (!isPlausiblePublicEmail(email)) return -1;
  const e = normalizeEmail(email);
  const [local, edom] = e.split('@');
  let host = '';
  try {
    host = sourceUrlOrDomain.includes('://')
      ? new URL(sourceUrlOrDomain).hostname
      : sourceUrlOrDomain;
  } catch {
    host = sourceUrlOrDomain;
  }
  host = host.replace(/^www\./i, '').toLowerCase();
  const ed = (edom || '').toLowerCase();
  let score = 0;

  const domainMatch =
    Boolean(host) && (ed === host || ed.endsWith(`.${host}`) || host.endsWith(`.${ed}`));
  const freeMail = /@(gmail|hotmail|outlook|yahoo|icloud|protonmail|proton)\./i.test(e);

  // Sin match de dominio ni free-mail → casi seguro basura del HTML
  if (!domainMatch && !freeMail) return -1;

  if (domainMatch) score += 20;
  if (freeMail) score += 5;
  if (CONTACT_LOCALS.has((local || '').toLowerCase())) score += 8;
  if (/^(info|reservas?|contacto)@/i.test(e)) score += 4;
  return score;
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

/** Emails en JSON-LD / microdatos (schema.org ContactPoint, Hotel, etc.). */
function extractEmailsFromJsonLd(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    const raw = (m[1] || '').trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const stack = Array.isArray(data) ? [...data] : [data];
      while (stack.length) {
        const cur = stack.pop();
        if (!cur || typeof cur !== 'object') continue;
        for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
          if (typeof v === 'string' && (k === 'email' || k === 'emailAddress')) {
            out.push(v);
          } else if (v && typeof v === 'object') {
            stack.push(v);
          } else if (Array.isArray(v)) {
            stack.push(...v);
          }
        }
      }
    } catch {
      /* JSON-LD inválido: ignorar */
    }
  }
  return out;
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

  for (const raw of extractEmailsFromJsonLd(html)) {
    const e = normalizeEmail(raw);
    if (isPlausiblePublicEmail(e)) found.add(e);
  }

  // Quitar CSS/JS/assets/imgs antes del regex suelto
  const stripped = html
    .replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<link[^>]*>/gi, ' ')
    .replace(/<img[^>]*>/gi, ' ')
    .replace(/url\([^)]*\)/gi, ' ')
    .replace(/class=["'][^"']*["']/gi, ' ')
    .replace(/srcset=["'][^"']*["']/gi, ' ')
    .replace(/href=["'][^"']*\.(?:css|js|woff2?|ttf|eot|png|jpe?g|gif|svg|webp)[^"']*["']/gi, ' ');

  const obfuscated = stripped
    .replace(
      /([a-z0-9._%+\-]{2,})\s*(?:\[\s*at\s*\]|\(at\)|\sat\s|&#64;|&#x40;)\s*([a-z0-9.\-]{2,})\s*(?:\[\s*dot\s*\]|\(dot\)|\sdot\s|\.|&#46;)\s*([a-z]{2,12})/gi,
      '$1@$2.$3'
    )
    .replace(/&#64;/gi, '@')
    .replace(/&#x40;/gi, '@');

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
