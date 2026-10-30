/**
 * Captación propietarios — ritmo anti-burst (referencia multi-proyecto).
 *
 * Preferir Resend/Brevo para cold (Zoho Mail usage policy prohíbe bulk/marketing).
 * Oleadas 50 cada ~30 min · delay 1.8s · tope día 1000.
 * Si altas ≥ 20 → no se envía más ese día (cola queda para mañana).
 */

/** Emails por oleada (anti rate-limit Zoho). */
export const PUBLIC_OWNER_LEADS_WAVE_MAX = 50;

/**
 * Alias histórico: tamaño de oleada (antes 250).
 * Mantener = WAVE_MAX para no romper imports.
 */
export const PUBLIC_OWNER_LEADS_DAILY_TARGET = PUBLIC_OWNER_LEADS_WAVE_MAX;

/**
 * Tope total del día = 20 oleadas × 50 = 1000
 * (cada ~30 min, ~08:00–17:30 Madrid) si altas < 20.
 * Nunca se reenvía al mismo email.
 */
export const PUBLIC_OWNER_LEADS_DAILY_HARD_CAP = 1000;

/** Nº de oleadas/día para llegar al hard cap (20 × 50). */
export const PUBLIC_OWNER_LEADS_WAVES_PER_DAY = 20;

/** Alias: todas las oleadas usan el mismo tope 50. */
export const PUBLIC_OWNER_LEADS_AFTERNOON_MAX = PUBLIC_OWNER_LEADS_WAVE_MAX;
export const PUBLIC_OWNER_LEADS_EVENING_MAX = PUBLIC_OWNER_LEADS_WAVE_MAX;
export const PUBLIC_OWNER_LEADS_NIGHT_MAX = PUBLIC_OWNER_LEADS_WAVE_MAX;

/**
 * KPI operativo (legacy altas/clic): se mantiene por compat.
 * La meta de negocio real es ONBOARDINGS_DAILY_GOAL.
 */
export const PUBLIC_OWNER_SIGNUPS_DAILY_GOAL = 20;

/**
 * Meta diaria de negocio: onboardings completados (1ª unidad creada + status completed).
 * Las oleadas paran al alcanzar este número (Europe/Madrid).
 */
export const PUBLIC_OWNER_ONBOARDINGS_DAILY_GOAL = 20;

/**
 * Tras CADA envío del cron, la cola debe volver a este nivel (~1000).
 * Nunca dejar recámara a 0.
 */
export const PUBLIC_OWNER_LEADS_MIN_QUEUED = 1000;

/**
 * Solo 3 Telegram/día: 2 progreso (slots) + cierre 21h.
 * Slot 8 = 12:00 Madrid (fin mañana) · slot 16 = 16:00 (media tarde).
 * @deprecated ya no se usa hito por volumen; se mantiene por compat tests/docs.
 */
export const PUBLIC_OWNER_LEADS_PROGRESS_EVERY = 150;

/** Slot oleada → Telegram progreso “fin de mañana” (12:00 Madrid). */
export const PUBLIC_OWNER_LEADS_TG_MORNING_SLOT = 8;

/** Slot oleada → Telegram progreso “media tarde” (16:00 Madrid). */
export const PUBLIC_OWNER_LEADS_TG_AFTERNOON_SLOT = 16;

export const PUBLIC_OWNER_LEADS_EMAIL_TYPE = 'public_owner_outreach';

export const PUBLIC_OWNER_LEADS_CAMPAIGN = 'public_owner_leads_es';

/**
 * Delay entre envíos (ms). 1.8s → 50 mails ≈ 90s + SMTP (cabe en Vercel Pro 300s).
 * Más agresivo (<1s) → Zoho 550 “Unusual sending activity”.
 */
export const PUBLIC_OWNER_LEADS_MIN_DELAY_MS = 1800;

/** Fuentes a scrapear por cron (oleada 50: menos extract basta). */
export const PUBLIC_OWNER_LEADS_EXTRACT_PER_RUN = 16;
