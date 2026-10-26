/** Oleada mañana (~09:00): hasta 250 emails nuevos. */
export const PUBLIC_OWNER_LEADS_DAILY_TARGET = 250;

/**
 * Tope total del día = 4 oleadas × 250 = 1000
 * (09 / 15 / 18 / 20h Madrid) si altas < 20.
 * Nunca se reenvía al mismo email.
 */
export const PUBLIC_OWNER_LEADS_DAILY_HARD_CAP = 1000;

/**
 * Oleada 15:00: hasta 250 emails NUEVOS si signed_up_today < 20.
 */
export const PUBLIC_OWNER_LEADS_AFTERNOON_MAX = 250;

/**
 * Oleada ~18:00: hasta 250 más si aún altas < 20.
 * Prioriza Flujo C (agencias).
 */
export const PUBLIC_OWNER_LEADS_EVENING_MAX = 250;

/**
 * Oleada ~20:00: 4ª oleada — hasta 250 (hasta HARD_CAP) si aún altas < 20.
 */
export const PUBLIC_OWNER_LEADS_NIGHT_MAX = 250;

/** KPI: 20 propietarios/agencias nuevos / día. */
export const PUBLIC_OWNER_SIGNUPS_DAILY_GOAL = 20;

/**
 * Tras CADA envío del cron, la cola debe volver a este nivel (~1000).
 * Nunca dejar recámara a 0.
 */
export const PUBLIC_OWNER_LEADS_MIN_QUEUED = 1000;

export const PUBLIC_OWNER_LEADS_EMAIL_TYPE = 'public_owner_outreach';

export const PUBLIC_OWNER_LEADS_CAMPAIGN = 'public_owner_leads_es';

/**
 * Delay entre envíos (ms). ~0.8s → ~250 mails/oleada caben en ~200s+SMTP
 * (Vercel Pro 300s). Más agresivo → Zoho 550 “Unusual sending activity”.
 */
export const PUBLIC_OWNER_LEADS_MIN_DELAY_MS = 800;

/** Fuentes a scrapear por cron (más = más emails/oleada dentro del timeout). */
export const PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN = 28;
