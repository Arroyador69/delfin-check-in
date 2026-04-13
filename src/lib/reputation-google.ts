import type { Tenant } from '@/lib/tenant';
import { resolveEffectivePlanType } from '@/lib/tenant-plan-billing';

export type ReputationGuestLocale = 'es' | 'en';

export interface ReputationGoogleSettings {
  enabled: boolean;
  reviewUrl: string;
  guestEmailLocale: ReputationGuestLocale;
}

const DEFAULT_SETTINGS: ReputationGoogleSettings = {
  enabled: false,
  reviewUrl: '',
  guestEmailLocale: 'es',
};

export function parseReputationGoogleFromConfig(
  config: Record<string, unknown> | null | undefined
): ReputationGoogleSettings {
  const raw = config?.reputationGoogle as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }
  const locale = raw.guestEmailLocale === 'en' ? 'en' : 'es';
  return {
    enabled: Boolean(raw.enabled),
    reviewUrl: typeof raw.reviewUrl === 'string' ? raw.reviewUrl.trim() : '',
    guestEmailLocale: locale,
  };
}

export function mergeReputationIntoConfig(
  current: Record<string, unknown>,
  next: ReputationGoogleSettings
): Record<string, unknown> {
  return {
    ...current,
    reputationGoogle: {
      enabled: next.enabled,
      reviewUrl: next.reviewUrl.trim(),
      guestEmailLocale: next.guestEmailLocale,
    },
  };
}

export function isProForReputation(tenant: Pick<Tenant, 'plan_type' | 'plan_id'>): boolean {
  return resolveEffectivePlanType(tenant) === 'pro';
}

/**
 * Enlaces habituales de reseñas / ficha Google. Evita usar esto como acortador genérico.
 */
export function isPlausibleGoogleReviewUrl(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 12 || s.length > 2048) return false;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'g.page' || h.endsWith('.g.page')) return true;
  if (h === 'maps.app.goo.gl' || h === 'goo.gl' || h === 'maps.google.com') return true;
  if (h === 'google.com' || h.endsWith('.google.com')) return true;
  if (h.endsWith('.googleusercontent.com')) return true;
  return false;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildGoogleReviewReminderContent(args: {
  guestName: string;
  propertyName: string;
  reviewUrl: string;
  locale: ReputationGuestLocale;
  tenantBrandName: string;
}): { subject: string; html: string; text: string } {
  const { guestName, propertyName, reviewUrl, locale, tenantBrandName } = args;
  const first = guestName.trim().split(/\s+/)[0] || guestName.trim();
  const prop = propertyName.trim() || (locale === 'en' ? 'your stay' : 'tu estancia');
  const brand = tenantBrandName.trim() || 'Delfín Check-in';

  if (locale === 'en') {
    const subject = `How was your stay at ${prop}?`;
    const safeReview = escapeHtml(reviewUrl);
    const html = `
<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hi ${escapeHtml(first)},</p>
  <p>We hope you enjoyed your stay at <strong>${escapeHtml(prop)}</strong>.</p>
  <p>If you have a minute, we would really appreciate a short review on Google. It helps other travellers and supports hosts who take bookings directly (not only through large platforms).</p>
  <p style="margin:28px 0;">
    <a href="${safeReview}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Leave a Google review</a>
  </p>
  <p style="font-size:14px;color:#6b7280;">This message was sent by ${escapeHtml(brand)} on behalf of your host.</p>
  <p style="font-size:13px;color:#9ca3af;">If the button does not work, copy and paste this link into your browser:<br/><span style="word-break:break-all;">${safeReview}</span></p>
</body></html>`.trim();
    const text = `Hi ${first},\n\nWe hope you enjoyed your stay at ${prop}.\n\nLeave a Google review: ${reviewUrl}\n\nSent by ${brand} on behalf of your host.`;
    return { subject, html, text };
  }

  const subject = `¿Qué tal tu estancia en ${prop}?`;
  const safeReview = escapeHtml(reviewUrl);
  const html = `
<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hola ${escapeHtml(first)},</p>
  <p>Esperamos que hayas disfrutado tu estancia en <strong>${escapeHtml(prop)}</strong>.</p>
  <p>Si te apetece, te agradeceríamos mucho una reseña breve en Google: ayuda a otros viajeros y refuerza a los anfitriones que reciben reservas directas (sin depender solo de portales grandes).</p>
  <p style="margin:28px 0;">
    <a href="${safeReview}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Dejar reseña en Google</a>
  </p>
  <p style="font-size:14px;color:#6b7280;">Este mensaje lo envía ${escapeHtml(brand)} en nombre de tu anfitrión.</p>
  <p style="font-size:13px;color:#9ca3af;">Si el botón no funciona, copia y pega este enlace en el navegador:<br/><span style="word-break:break-all;">${safeReview}</span></p>
</body></html>`.trim();
  const text = `Hola ${first},\n\nEsperamos que hayas disfrutado tu estancia en ${prop}.\n\nDejar reseña en Google: ${reviewUrl}\n\nEnviado por ${brand} en nombre de tu anfitrión.`;
  return { subject, html, text };
}
