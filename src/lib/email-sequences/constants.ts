/** Video de onboarding general (mail 2 de Fase 1). */
export const ONBOARDING_VIDEO_URL = 'https://www.youtube.com/watch?v=-bcIKsL1vsM';

export const ONBOARDING_VIDEO_ID = '-bcIKsL1vsM';

/** Video: configurar credenciales MIR / envío parte de viajeros (mail 3 de Fase 1). */
export const MIR_CREDENTIALS_VIDEO_URL = 'https://www.youtube.com/watch?v=FVI2aoR05ww';

export const MIR_CREDENTIALS_VIDEO_ID = 'FVI2aoR05ww';

export const SEQUENCE_KEY_PHASE_1 = 'phase_1_activation';

export const SEQUENCE_KEY_PHASE_2 = 'phase_2_upgrade';

export type LifecycleSegment =
  | 'not_eligible'
  | 'phase_1_eligible'
  | 'phase_1_completed'
  | 'phase_2_eligible'
  | 'phase_2_completed'
  | 'unsubscribed';
