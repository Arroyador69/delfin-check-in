/**
 * Solo España + solo alquiler vacacional / turismo rural / apartamentos turísticos.
 * Rechaza seguros, banca, inmobiliaria pura, clínicas, etc. (coste de oportunidad).
 */

export type NicheVerdict = {
  ok: boolean;
  spain: boolean;
  vacation: boolean;
  reason: string;
};

/** Señales positivas de alojamiento vacacional / rural / turístico. */
const VACATION_POSITIVE = [
  /casa\s*rural/i,
  /casas\s*rurales/i,
  /alquiler\s*vacacional/i,
  /vivienda\s*(de\s*)?uso\s*tur[ií]stico/i,
  /apartamento\s*tur[ií]stico/i,
  /apartamentos\s*tur[ií]sticos/i,
  /turismo\s*rural/i,
  /alojamiento\s*tur[ií]stico/i,
  /alojamientos?\s*rural/i,
  /\bvut\b/i,
  /\bvuut\b/i,
  /ses\s*hospedajes/i,
  /parte\s*de\s*viajeros/i,
  /rd\s*933/i,
  /\bhuesped(es)?\b/i,
  /\bhuésped(es)?\b/i,
  /\breserva(s|r)?\b/i,
  /\bcheck[- ]?in\b/i,
  /\bpazo\b/i,
  /\bfinca\b/i,
  /\bcortijo\b/i,
  /\bvilla\b/i,
  /\bcottage\b/i,
  /\bglamping\b/i,
  /\bcamping\b/i,
  /\balbergue\b/i,
  /\bhostal\b/i,
  /\bpension\b/i,
  /\bpensión\b/i,
  /\bhotel\s*rural\b/i,
  /noches?\s*(m[ií]nimas?|disponibles?)/i,
  /capacidad\s*\d+\s*personas/i,
  /habitaciones?\s*(dobles?|individuales?)/i,
];

/** Negocios que NO son nuestro ICP (gasto de cuota 50/día). */
const VACATION_NEGATIVE = [
  /\bseguros?\b/i,
  /\binsurance\b/i,
  /\bcorredur[ií]a\b/i,
  /\bbanca\b/i,
  /\bbanco\b/i,
  /\bhipoteca/i,
  /\babogad/i,
  /\bnotar[ií]a\b/i,
  /\bcl[ií]nica\b/i,
  /\bdental\b/i,
  /\bfarmacia\b/i,
  /\btaller\s+mec[aá]nico\b/i,
  /\bconcesionario\b/i,
  /\brestaurante\b(?!.*aloj)/i,
  /\bcatering\b/i,
  /\binmobiliaria\b/i,
  /\bcompraventa\b/i,
  /\bpromotora\b/i,
  /\bconstructora\b/i,
  /\bagencia\s+de\s+viajes\b/i,
  /\btouroperador\b/i,
  /\bsoftware\s+house\b/i,
  /\bconsultor[ií]a\b/i,
  /\bmarketing\s+digital\b/i,
  /\bgestor[ií]a\b/i,
  /\basesor[ií]a\s+fiscal\b/i,
];

const SPAIN_POSITIVE = [
  /\bespaña\b/i,
  /\bspain\b/i,
  /\b\+34\b/,
  /\bespana\b/i,
  /\banaluc[ií]a\b/i,
  /\bcatalu[nñ]a\b/i,
  /\bcatalunya\b/i,
  /\bgalicia\b/i,
  /\basturias\b/i,
  /\bcantabria\b/i,
  /\bpa[ií]s\s+vasco\b/i,
  /\beuskadi\b/i,
  /\bnavarra\b/i,
  /\barag[oó]n\b/i,
  /\bla\s+rioja\b/i,
  /\bcastilla\b/i,
  /\bextremadura\b/i,
  /\bmurcia\b/i,
  /\bvalencia\b/i,
  /\bcomunitat\s+valenciana\b/i,
  /\bbaleares\b/i,
  /\bcanarias\b/i,
  /\bmadrid\b/i,
  /\bbarcelona\b/i,
  /\bsevilla\b/i,
  /\bmalaga\b/i,
  /\bmálaga\b/i,
  /\bc[oó]rdoba\b/i,
  /\bgranada\b/i,
  /\bpontevedra\b/i,
  /\ba\s*coru[nñ]a\b/i,
  /\blugo\b/i,
  /\bourense\b/i,
  /\bllanes\b/i,
  /\bsantiago\s+de\s+compostela\b/i,
  /cif\s*[a-z]?\d{8}/i,
];

const HOST_VACATION = [
  /casarural/i,
  /casa-rural/i,
  /\bcasa[s]?[a-z0-9-]*/i,
  /turismo.?rural/i,
  /rural/i,
  /vacacional/i,
  /apartamento/i,
  /alojamiento/i,
  /pazo/i,
  /finca/i,
  /cortijo/i,
  /villa/i,
  /cottage/i,
  /glamping/i,
  /camping/i,
  /albergue/i,
  /hosped/i,
  /agrotur/i,
  /turismorural/i,
];

const HOST_NEGATIVE = [
  /seguro/i,
  /insurance/i,
  /banco/i,
  /bank/i,
  /abogad/i,
  /clinica/i,
  /dental/i,
  /inmobiliaria/i,
  /gestoria/i,
  /asesoria/i,
  /misterplan/i,
  /ruralgest/i,
  /comunicacion/i,
  /marketing/i,
  /software/i,
  /globales\.es/i,
];

function hostOf(url: string): string {
  try {
    return new URL(url.includes('://') ? url : `https://${url}`).hostname
      .replace(/^www\./, '')
      .toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Host con TLD típico ES (opcional). NO es requisito:
 * muchas casas rurales usan .com — la España se confirma con +34 / provincias / lang=es.
 */
export function looksSpanishHost(urlOrHost: string): boolean {
  const host = hostOf(urlOrHost);
  if (!host) return false;
  return (
    host.endsWith('.es') ||
    host.endsWith('.gal') ||
    host.endsWith('.cat') ||
    host.endsWith('.eus')
  );
}

export function hostSuggestsVacation(urlOrHost: string): boolean {
  const host = hostOf(urlOrHost);
  if (!host) return false;
  if (HOST_NEGATIVE.some((r) => r.test(host))) return false;
  return HOST_VACATION.some((r) => r.test(host));
}

export function hostSuggestsNonVacation(urlOrHost: string): boolean {
  const host = hostOf(urlOrHost);
  return Boolean(host && HOST_NEGATIVE.some((r) => r.test(host)));
}

function countMatches(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const r of patterns) {
    if (r.test(text)) n += 1;
  }
  return n;
}

/**
 * Clasifica URL + HTML: debe ser España y alquiler vacacional / rural / turístico.
 */
export function classifySpainVacationRental(
  url: string,
  html: string
): NicheVerdict {
  if (hostSuggestsNonVacation(url)) {
    return { ok: false, spain: false, vacation: false, reason: 'host-no-vacacional' };
  }

  const text = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 120_000);

  const neg = countMatches(text, VACATION_NEGATIVE);
  const pos = countMatches(text, VACATION_POSITIVE);
  const hostVac = hostSuggestsVacation(url);
  const spainHost = looksSpanishHost(url);
  const spainContent = countMatches(text, SPAIN_POSITIVE) >= 1 || /lang\s*=\s*["']?es/i.test(html);

  // Negativos fuertes sin positivos claros → rechazo
  if (neg >= 2 && pos === 0 && !hostVac) {
    return { ok: false, spain: spainHost || spainContent, vacation: false, reason: 'contenido-no-vacacional' };
  }
  if (neg >= 1 && pos === 0 && !hostVac) {
    return { ok: false, spain: spainHost || spainContent, vacation: false, reason: 'negocio-ajeno' };
  }

  // Vacacional por contenido o host (casa*, pazo*, rural…)
  const vacation = pos >= 1 || hostVac;

  // España: +34, provincias, lang=es, o TLD .es/.gal… — NO exigir solo .es
  // Un .com español con "Galicia" / +34 / lang=es pasa; LatAm en inglés sin señales ES no.
  const spain = spainHost || spainContent;

  if (!vacation) {
    return { ok: false, spain, vacation: false, reason: 'sin-señal-alojamiento' };
  }
  if (!spain) {
    return { ok: false, spain: false, vacation: true, reason: 'sin-señal-españa' };
  }

  return { ok: true, spain: true, vacation: true, reason: 'ok' };
}

/** Extrae enlaces candidatos a otras webs de alojamiento ES (descubrimiento). */
export function extractSpainVacationOutboundLinks(
  pageUrl: string,
  html: string,
  limit = 8
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let baseHost = '';
  try {
    baseHost = new URL(pageUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return [];
  }

  const junkPath = /\.(png|jpe?g|gif|svg|webp|pdf|css|js|ico|xml|json)(\?|$)/i;
  const re = /href\s*=\s*["'](https?:\/\/[^"'#]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < limit) {
    const href = m[1].split('?')[0];
    if (junkPath.test(href)) continue;
    let host = '';
    try {
      const u = new URL(href);
      host = u.hostname.replace(/^www\./, '').toLowerCase();
      // Solo home o contacto, no assets CDN
      if (u.pathname.length > 80) continue;
    } catch {
      continue;
    }
    if (!host || host === baseHost) continue;
    if (seen.has(host)) continue;
    if (hostSuggestsNonVacation(href)) continue;
    if (!looksSpanishHost(href) && !hostSuggestsVacation(href)) continue;
    // Evitar directorios/agregadores y soft
    if (/escapada|booking|airbnb|siweb|soft|cdn|cloudflare|wix|wordpress\.com/i.test(host)) {
      continue;
    }
    seen.add(host);
    out.push(`https://${host}`);
  }
  return out;
}
