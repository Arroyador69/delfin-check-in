/** Oleada mañana (~09:00): hasta 50 emails nuevos. */
export const PUBLIC_OWNER_LEADS_DAILY_TARGET = 50;

/**
 * Tope total del día = mañana 50 + tarde 50 (si altas < 20).
 * Nunca se reenvía al mismo email.
 */
export const PUBLIC_OWNER_LEADS_DAILY_HARD_CAP = 100;

/**
 * Oleada 15:00: hasta 50 emails NUEVOS si signed_up_today < 20.
 * Si hay 19 o menos → se ejecuta. Si hay 20+ → no envía.
 */
export const PUBLIC_OWNER_LEADS_AFTERNOON_MAX = 50;

/** KPI: 20 propietarios nuevos / día. */
export const PUBLIC_OWNER_SIGNUPS_DAILY_GOAL = 20;

export const PUBLIC_OWNER_LEADS_EMAIL_TYPE = 'public_owner_outreach';

export const PUBLIC_OWNER_LEADS_CAMPAIGN = 'public_owner_leads_es';

export const PUBLIC_OWNER_LEADS_MIN_DELAY_MS = 1500;

/** Fuentes a scrapear por cron (mantener recámara). */
export const PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN = 50;
