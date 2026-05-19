/** IDs de vídeos tutoriales en YouTube (canal Delfín Check-in). */
export const TUTORIAL_VIDEOS = {
  whatIsDelfin: 'sH4Yv5t5hdI',
  onboarding: '-bcIKsL1vsM',
  mirCredentials: 'FVI2aoR05ww',
  cleaningLinks: 'rT2zJ1oXGBs',
  micrositeStripe: 'ux4N9Xf7hJU',
  googleReputation: 'TZuY8RAgSj4',
} as const;

export type TutorialVideoKey = keyof typeof TUTORIAL_VIDEOS;

export function getTutorialVideoEmbedUrl(key: TutorialVideoKey): string {
  return `https://www.youtube.com/embed/${TUTORIAL_VIDEOS[key]}`;
}

export function getTutorialVideoWatchUrl(key: TutorialVideoKey): string {
  return `https://www.youtube.com/watch?v=${TUTORIAL_VIDEOS[key]}`;
}
