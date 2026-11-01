/**
 * Captación propietarios — ritmo anti-burst (referencia multi-proyecto).
 *
 * Preferir Resend/Brevo para cold (Zoho Mail usage policy prohíbe bulk/marketing).
 * Oleadas 50 cada ~30 min · delay 1.8s · tope día 1000.
 * Si altas ≥ 20 → no se envía más ese día (cola queda para mañana).
 */

/**
 * Kill switch captación (oleadas cold).
 * - `PUBLIC_OWNER_LEADS_PAUSED=1` → parado
 * - `PUBLIC_OWNER_LEADS_PAUSED=0` / sin env → activo (bienvenida vía Resend + SMTP fallback)
 */
export function isPublicOwnerLeadsPaused(): boolean {
  const v = String(process.env.PUBLIC_OWNER_LEADS_PAUSED || '')
    .trim()
    .toLowerCase();
  if (v === '1' || v === 'true' || v === 'on') return true;
  return false;
}

/**
 * Kill switch reintentos automáticos de bienvenida (cron email-sequences).
 * Misma semántica que captación; override: ONBOARDING_WELCOME_RETRY_PAUSED=0|1
 */
export function isOnboardingWelcomeRetryPaused(): boolean {
  const v = String(process.env.ONBOARDING_WELCOME_RETRY_PAUSED || '')
    .trim()
    .toLowerCase();
  if (v === '0' || v === 'false' || v === 'off') return false;
  if (v === '1' || v === 'true' || v === 'on') return true;
  return isPublicOwnerLeadsPaused();
}

/** Emails por oleada (anti rate-limit Zoho). */
export const PUBLIC_OWNER_LEADS_WAVE_MAX = 50;

/**
 * Alias histórico: tamaño de oleada (antes 250).
 * Mantener = WAVE_MAX para no romper imports.
 */
export const PUBLIC_OWNER_LEADS_DAILY_TARGET = PUBLIC_OWNER_LEADS_WAVE_MAX;

/**
 * Tope total del día (cold + follow-up) = 10 oleadas × 50 = 500.
 * Reparto: cold 350 + FU 150. Cold nunca se reenvía al mismo email.
 */
export const PUBLIC_OWNER_LEADS_DAILY_HARD_CAP = 500;

/** Tope diario solo cold (primer contacto). */
export const PUBLIC_OWNER_LEADS_COLD_DAILY_CAP = 350;

/** Tope diario solo follow-ups (FU-A click > FU-B open > FU-C silencio). */
export const PUBLIC_OWNER_LEADS_FU_DAILY_CAP = 150;

/** Nº de oleadas de envío/día para llegar al hard cap (10 × 50). */
export const PUBLIC_OWNER_LEADS_WAVES_PER_DAY = 10;

/**
 * Slots de cron (cada 30 min, 08:00–17:30 Madrid). Independiente de las
 * oleadas que realmente envían: el cron sigue disparando, el cap corta el envío.
 * Mantiene intactos los slots de Telegram (8 y 16).
 */
export const PUBLIC_OWNER_LEADS_CRON_SLOTS_PER_DAY = 20;

/* ── Follow-up outreach (port de NFCTap business-leads/constants) ── */

/** FU-A: días tras click para el 1er follow-up. */
export const POL_FU_CLICK_DELAY_DAYS = 2;
/** FU-A: días entre 1er y 2º follow-up a quien hizo click. */
export const POL_FU_CLICK_SECOND_DELAY_DAYS = 3;
/** FU-B: días desde el cold enviado hasta follow-up a quien abrió (sin click). */
export const POL_FU_OPEN_DELAY_DAYS = 5;
/** FU-C: días desde el cold enviado hasta follow-up a silenciosos. */
export const POL_FU_SILENT_DELAY_DAYS = 8;

/** Máx. toques totales (cold incluido). Click: cold + 2 FU. Open/silent: cold + 1 FU. */
export const POL_FU_MAX_TOUCHES_CLICK = 3;
export const POL_FU_MAX_TOUCHES_OPEN = 2;
export const POL_FU_MAX_TOUCHES_SILENT = 2;

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
