import Constants from 'expo-constants';

import { api } from './api';

function trimEndSlash(s: string): string {
  return s.replace(/\/$/, '');
}

/** Origen público (misma lógica que web): env > app.config extra > API base. */
export function getCleaningPublicOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_CLEANING_PUBLIC_BASE_URL?.trim();
  const fromExtra = (
    Constants.expoConfig?.extra as { CLEANING_PUBLIC_BASE_URL?: string } | undefined
  )?.CLEANING_PUBLIC_BASE_URL?.trim();
  const raw = fromEnv || fromExtra || '';
  if (raw) return trimEndSlash(raw);
  return trimEndSlash(String(api.defaults.baseURL || ''));
}

/** Página HTML pública para la limpiadora (sin login). */
export function cleanerLimpiezaPageUrl(publicToken: string): string {
  return `${getCleaningPublicOrigin()}/limpieza/${publicToken}`;
}

/** Feed iCal (suscripción); debe ser una ruta pública en el middleware. */
export function icalCleaningFeedUrl(icalToken: string): string {
  return `${getCleaningPublicOrigin()}/api/ical/cleaning/${icalToken}`;
}
