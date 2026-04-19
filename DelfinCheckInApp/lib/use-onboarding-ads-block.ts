import { useSegments } from 'expo-router';

/**
 * Primera experiencia guiada: `/(app)/onboarding`.
 * Ahí no deben mostrarse banners ni intersticiales (independiente del plan).
 */
export function useIsOnboardingRoute(): boolean {
  const segments = useSegments();
  return segments.includes('onboarding');
}
