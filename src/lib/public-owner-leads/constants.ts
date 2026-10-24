/** Oleada mañana: emails outreach (reputación Zoho). */
export const PUBLIC_OWNER_LEADS_DAILY_TARGET = 50;

/**
 * Tope total del día (mañana + tarde si hace falta para meta 20 altas).
 * Nunca se reenvía al mismo email.
 */
export const PUBLIC_OWNER_LEADS_DAILY_HARD_CAP = 80;

/** Máximo extra en oleada 15:00 si signed_up_today < meta. */
export const PUBLIC_OWNER_LEADS_AFTERNOON_MAX = 30;

/** KPI negocio: altas nuevas de propietarios / día. */
export const PUBLIC_OWNER_SIGNUPS_DAILY_GOAL = 20;

export const PUBLIC_OWNER_LEADS_EMAIL_TYPE = 'public_owner_outreach';

export const PUBLIC_OWNER_LEADS_CAMPAIGN = 'public_owner_leads_es';

/** Delay entre scrapes / envíos (ms). */
export const PUBLIC_OWNER_LEADS_MIN_DELAY_MS = 1500;

/** Fuentes a scrapear por cron (resto quedan pending). */
export const PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN = 40;
