import type { SupportKB } from './types';
import { KB_ES } from './kb-es';
import { KB_EN } from './kb-en';
import { KB_FR } from './kb-fr';
import { KB_IT } from './kb-it';
import { KB_PT } from './kb-pt';

export function getKBForLocale(locale: string | undefined | null): SupportKB {
  const norm = (locale || 'es').split('-')[0].toLowerCase();
  if (norm === 'en') return KB_EN;
  if (norm === 'fr') return KB_FR;
  if (norm === 'it') return KB_IT;
  if (norm === 'pt' || norm === 'pt-pt' || norm === 'pt-br') return KB_PT;
  return KB_ES;
}

