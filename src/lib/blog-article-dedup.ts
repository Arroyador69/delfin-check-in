import { sql } from '@/lib/db';

/** Normaliza título para comparar duplicados (sin acentos ni puntuación). */
export function normalizeArticleTitle(title: string): string {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export type BlogTopicAngle = {
  /** Identificador único del ángulo (nunca reutilizar). */
  angleId: string;
  /** Familia temática (agrupa variantes). */
  topicKey: string;
  /** Guía para OpenAI; el título final debe ser distinto a artículos ya publicados. */
  seedTitle: string;
};

/**
 * Temas base con varios ángulos cada uno → evita repetir el mismo título cuando rota el cron.
 */
export const BLOG_TOPIC_ANGLES: BlogTopicAngle[] = [
  {
    angleId: 'mir-config-a1',
    topicKey: 'mir-config',
    seedTitle: 'Cómo configurar el MIR (Ministerio del Interior) en Delfín Check-in paso a paso (2026)',
  },
  {
    angleId: 'mir-config-a2',
    topicKey: 'mir-config',
    seedTitle: 'Alta en el MIR desde cero: credenciales, certificados y primer envío con Delfín Check-in',
  },
  {
    angleId: 'mir-config-a3',
    topicKey: 'mir-config',
    seedTitle: 'Checklist MIR 2026: qué datos pedir al huésped antes del check-in digital',
  },
  {
    angleId: 'rd933-guia-a1',
    topicKey: 'rd933-guia',
    seedTitle: 'RD 933/2021 explicado: obligaciones, plazos y cómo cumplir con Delfín Check-in (Actualizado 2026)',
  },
  {
    angleId: 'rd933-guia-a2',
    topicKey: 'rd933-guia',
    seedTitle: 'Parte de viajeros y RD 933: qué cambió en 2026 y cómo automatizarlo en tu alojamiento',
  },
  {
    angleId: 'errores-ses-a1',
    topicKey: 'errores-ses',
    seedTitle: 'Errores frecuentes al enviar partes al SES Hospedajes y cómo solucionarlos (Guía 2026)',
  },
  {
    angleId: 'errores-ses-a2',
    topicKey: 'errores-ses',
    seedTitle: 'Códigos de error SES/MIR más comunes: diagnóstico rápido para propietarios',
  },
  {
    angleId: 'airbnb-booking-a1',
    topicKey: 'airbnb-booking',
    seedTitle: 'Airbnb y Booking: ¿quién registra a los viajeros? Qué exige el Ministerio (Actualizado 2026)',
  },
  {
    angleId: 'airbnb-booking-a2',
    topicKey: 'airbnb-booking',
    seedTitle: 'OTA vs registro legal: responsabilidades del anfitrión con MIR y Delfín Check-in',
  },
  {
    angleId: 'checkin-digital-a1',
    topicKey: 'checkin-digital',
    seedTitle: 'Check-in digital: cómo automatizar el registro de viajeros y evitar multas (Guía práctica 2026)',
  },
  {
    angleId: 'checkin-digital-a2',
    topicKey: 'checkin-digital',
    seedTitle: 'Registro digital de huéspedes: flujo completo desde la reserva hasta el envío al MIR',
  },
  {
    angleId: 'checkin-digital-a3',
    topicKey: 'checkin-digital',
    seedTitle: 'Automatizar el check-in sin perder control legal: plantillas y buenas prácticas 2026',
  },
  {
    angleId: 'ical-sync-a1',
    topicKey: 'ical-sync',
    seedTitle: 'Sincronización iCal: evita overbooking y mantén calendarios al día (tutorial con Delfín Check-in)',
  },
  {
    angleId: 'ical-sync-a2',
    topicKey: 'ical-sync',
    seedTitle: 'Calendarios iCal entre Airbnb, Booking y tu PMS: guía anti-overbooking',
  },
  {
    angleId: 'reservas-directas-a1',
    topicKey: 'reservas-directas',
    seedTitle: 'Reservas directas: cómo reducir comisiones con el microsite de Delfín Check-in (paso a paso)',
  },
  {
    angleId: 'reservas-directas-a2',
    topicKey: 'reservas-directas',
    seedTitle: 'Microsite de reservas propio: SEO local, pagos y menos comisiones OTA',
  },
  {
    angleId: 'reservas-directas-a3',
    topicKey: 'reservas-directas',
    seedTitle: 'De dependencia OTA a reservas directas: estrategia 90 días con Delfín Check-in',
  },
  {
    angleId: 'limpieza-a1',
    topicKey: 'limpieza',
    seedTitle: 'Gestión de limpieza en alquiler vacacional: checklist, horarios y automatización con Delfín Check-in',
  },
  {
    angleId: 'limpieza-a2',
    topicKey: 'limpieza',
    seedTitle: 'Coordinar limpieza entre check-out y check-in: turnos, incidencias y mensajes automáticos',
  },
  {
    angleId: 'facturas-a1',
    topicKey: 'facturas',
    seedTitle: 'Cómo emitir facturas a huéspedes en alquiler vacacional (y automatizarlo) - Guía 2026',
  },
  {
    angleId: 'facturas-a2',
    topicKey: 'facturas',
    seedTitle: 'Facturación a turistas en España: datos obligatorios y flujo con tu software de gestión',
  },
  {
    angleId: 'multas-a1',
    topicKey: 'multas',
    seedTitle: 'Multas por no registrar viajeros en España: importes, casos reales y cómo evitarlas (2026)',
  },
  {
    angleId: 'multas-a2',
    topicKey: 'multas',
    seedTitle: 'Sanciones MIR y SES: escenarios reales para apartamentos turísticos y cómo prevenirlas',
  },
  {
    angleId: 'multas-a3',
    topicKey: 'multas',
    seedTitle: '¿Cuánto arriesgas si no envías el parte de viajeros? Tabla práctica 2026',
  },
];

export async function loadUsedBlogAngleIds(): Promise<Set<string>> {
  const r = await sql`
    SELECT meta_keywords, title
    FROM blog_articles
    WHERE meta_keywords ILIKE '%auto_topic_angle:%'
       OR meta_keywords ILIKE '%auto_topic_key:%'
  `;
  const used = new Set<string>();
  for (const row of r.rows as { meta_keywords?: string; title?: string }[]) {
    const mk = String(row.meta_keywords || '');
    const angleMatch = mk.match(/auto_topic_angle:([a-z0-9-]+)/i);
    if (angleMatch?.[1]) {
      used.add(angleMatch[1]);
      continue;
    }
    const keyMatch = mk.match(/auto_topic_key:([a-z0-9-]+)/i);
    if (keyMatch?.[1]) {
      used.add(`${keyMatch[1]}-a1`);
    }
  }
  return used;
}

export async function loadExistingNormalizedTitles(): Promise<Set<string>> {
  const r = await sql`SELECT title FROM blog_articles`;
  const set = new Set<string>();
  for (const row of r.rows as { title?: string }[]) {
    const n = normalizeArticleTitle(String(row.title || ''));
    if (n) set.add(n);
  }
  return set;
}

export async function loadRecentTitlesForPrompt(limit = 25): Promise<string[]> {
  const r = await sql`
    SELECT title FROM blog_articles
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return (r.rows as { title?: string }[]).map((row) => String(row.title || '')).filter(Boolean);
}

export function isNormalizedTitleTaken(
  title: string,
  existing: Set<string>
): boolean {
  const n = normalizeArticleTitle(title);
  if (!n) return true;
  return existing.has(n);
}

export type BlogCronBatch = 'morning' | 'afternoon';

export async function pickBlogAngleForBatch(batch: BlogCronBatch): Promise<BlogTopicAngle> {
  const day = new Date().toISOString().slice(0, 10);

  const usedToday = await sql`
    SELECT id FROM blog_articles
    WHERE created_at >= ${`${day}T00:00:00.000Z`}::timestamptz
      AND created_at < ${`${day}T23:59:59.999Z`}::timestamptz
      AND meta_keywords ILIKE ${`%auto_topic:${batch}:%`}
    LIMIT 1
  `;
  if (usedToday.rows.length > 0) {
    throw new Error(`already_generated:${batch}`);
  }

  const usedAngles = await loadUsedBlogAngleIds();
  const existingTitles = await loadExistingNormalizedTitles();

  const available = BLOG_TOPIC_ANGLES.filter((angle) => {
    if (usedAngles.has(angle.angleId)) return false;
    if (isNormalizedTitleTaken(angle.seedTitle, existingTitles)) return false;
    return true;
  });

  const pool = available.length > 0 ? available : BLOG_TOPIC_ANGLES.filter(
    (angle) => !isNormalizedTitleTaken(angle.seedTitle, existingTitles)
  );

  if (pool.length === 0) {
    throw new Error('no_topics_available: todos los ángulos/títulos base ya están usados');
  }

  const parityPool = pool.filter((_, idx) =>
    batch === 'morning' ? idx % 2 === 0 : idx % 2 === 1
  );
  const finalPool = parityPool.length > 0 ? parityPool : pool;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}
