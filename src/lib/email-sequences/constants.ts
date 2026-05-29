/** Video de onboarding general (mail 2 de Fase 1). */
export const ONBOARDING_VIDEO_URL = 'https://www.youtube.com/watch?v=-bcIKsL1vsM';

export const ONBOARDING_VIDEO_ID = '-bcIKsL1vsM';

/** Video: configurar credenciales MIR / envío parte de viajeros (mail 3 de Fase 1). */
export const MIR_CREDENTIALS_VIDEO_URL = 'https://www.youtube.com/watch?v=FVI2aoR05ww';

export const MIR_CREDENTIALS_VIDEO_ID = 'FVI2aoR05ww';

export const SEQUENCE_KEY_PHASE_1 = 'phase_1_activation';

export const SEQUENCE_KEY_PHASE_2 = 'phase_2_upgrade';

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
