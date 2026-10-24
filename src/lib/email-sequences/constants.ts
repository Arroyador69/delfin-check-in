/** Video de onboarding general (mail 2 de Fase 1). */
export const ONBOARDING_VIDEO_URL = 'https://www.youtube.com/watch?v=-bcIKsL1vsM';

export const ONBOARDING_VIDEO_ID = '-bcIKsL1vsM';

/** Video: configurar credenciales MIR / envío parte de viajeros (mail 3 de Fase 1). */
export const MIR_CREDENTIALS_VIDEO_URL = 'https://www.youtube.com/watch?v=FVI2aoR05ww';

export const MIR_CREDENTIALS_VIDEO_ID = 'FVI2aoR05ww';

export const SEQUENCE_KEY_PHASE_1 = 'phase_1_activation';

export const SEQUENCE_KEY_PHASE_2 = 'phase_2_upgrade';

/**
 * Secuencia post-signup / prueba gratis (calendario fijo D0→D7).
 * Solo leads con opt-in o signup. Copy MiroFish: Check-in=MIR · Tap Wall=NFC · App=mando.
 */
export const SEQUENCE_KEY_OWNER_TRIAL_MIR = 'owner_trial_mir';

/** UTM de campaña trial MIR (todos los CTAs de owner_trial_mir). */
export const OWNER_ONBOARDING_UTM = {
  utm_source: 'email',
  utm_medium: 'onboarding',
  utm_campaign: 'trial_mir',
} as const;

/** Landing Tap Wall (add-on NFC; no confundir con Check-in/MIR). */
export const TAP_WALL_LANDING_URL = 'https://tap.delfincheckin.com';

/** Tras abrir un mail, esperar N días antes del siguiente paso. */
export const LIFECYCLE_DAYS_AFTER_OPEN = 1;

/** Sin apertura, reintentar el mismo paso tras N días. */
export const LIFECYCLE_DAYS_WITHOUT_OPEN_RETRY = 4;

/** Máximo de reintentos por paso antes de espaciar (sigue intentando). */
export const LIFECYCLE_MAX_RETRIES_PER_STEP = 12;

/** Tras agotar reintentos, días entre intentos adicionales. */
export const LIFECYCLE_SLOW_RETRY_DAYS = 7;

export type LifecycleSegment =
  | 'not_eligible'
  | 'phase_1_eligible'
  | 'phase_1_completed'
  | 'phase_2_eligible'
  | 'phase_2_completed'
  | 'unsubscribed';
