/** Emails outreach / día (soporte de captación; hard cap reputación). */
export const PUBLIC_OWNER_LEADS_DAILY_TARGET = 50;

/** Tope hard anti-spam / reputación SMTP (no superar salvo override env). */
export const PUBLIC_OWNER_LEADS_DAILY_HARD_CAP = 50;

/** KPI negocio: altas nuevas de propietarios / día (landing + atribución). */
export const PUBLIC_OWNER_SIGNUPS_DAILY_GOAL = 20;

export const PUBLIC_OWNER_LEADS_EMAIL_TYPE = 'public_owner_outreach';

export const PUBLIC_OWNER_LEADS_CAMPAIGN = 'public_owner_leads_es';

/** Delay entre scrapes / envíos (ms). */
export const PUBLIC_OWNER_LEADS_MIN_DELAY_MS = 1500;

/** Fuentes a scrapear por cron (resto quedan pending). */
export const PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN = 40;
