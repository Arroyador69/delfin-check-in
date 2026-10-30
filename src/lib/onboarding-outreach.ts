/** Marca de onboarding lite (cold outreach): 2 pantallas, no el wizard de 6. */
export const ONBOARDING_OUTREACH_COOKIE = 'onboarding_src_outreach';
export const ONBOARDING_OUTREACH_SESSION_KEY = 'onboarding_src_outreach';

export function isOutreachSrc(value: unknown): boolean {
  return value === 'outreach' || value === true || value === '1';
}

/** Lectura síncrona en cliente (evita flash del wizard de 6 pasos). */
export function readOutreachStickyClient(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(ONBOARDING_OUTREACH_SESSION_KEY) === '1') return true;
  } catch {
    /* ignore */
  }
  try {
    return document.cookie
      .split(';')
      .some((c) => c.trim().startsWith(`${ONBOARDING_OUTREACH_COOKIE}=1`));
  } catch {
    return false;
  }
}

export function persistOutreachStickyClient(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ONBOARDING_OUTREACH_SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${ONBOARDING_OUTREACH_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;
  } catch {
    /* ignore */
  }
}

export function clearOutreachStickyClient(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ONBOARDING_OUTREACH_SESSION_KEY);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${ONBOARDING_OUTREACH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}
