import type { Tenant } from '@/lib/tenant';
import { resolveEffectivePlanType } from '@/lib/tenant-plan-billing';

/** Idioma del correo al huésped: solo ES y EN (comunicación habitual con huéspedes). */
export type ReputationGuestLocale = 'es' | 'en';

/** Texto recomendado (editable). Mismos placeholders en ES y EN. */
export const RECOMMENDED_GUEST_MESSAGE_ES = `Esperamos que hayas disfrutado tu estancia en {{propiedad}}.

Si te apetece, te agradeceríamos mucho una reseña breve en Google: ayuda a otros viajeros y refuerza a los anfitriones que reciben reservas directas (sin depender solo de portales grandes).`;

export const RECOMMENDED_GUEST_MESSAGE_EN = `We hope you enjoyed your stay at {{propiedad}}.

If you have a minute, we would really appreciate a short review on Google. It helps other travellers and supports hosts who take bookings directly (not only through large platforms).`;

export const GUEST_MESSAGE_MAX_LENGTH = 6000;

export interface ReputationGoogleSettings {
  enabled: boolean;
  reviewUrl: string;
  guestEmailLocale: ReputationGuestLocale;
  /** Cuerpo del mensaje (sin saludo fijo). Vacío = usar recomendado por defecto. */
  guestMessageEs: string;
  guestMessageEn: string;
}

const DEFAULT_SETTINGS: ReputationGoogleSettings = {
  enabled: false,
  reviewUrl: '',
  guestEmailLocale: 'es',
  guestMessageEs: '',
  guestMessageEn: '',
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
    guestMessageEs: typeof raw.guestMessageEs === 'string' ? raw.guestMessageEs : '',
    guestMessageEn: typeof raw.guestMessageEn === 'string' ? raw.guestMessageEn : '',
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
      guestMessageEs: next.guestMessageEs,
      guestMessageEn: next.guestMessageEn,
    },
  };
}

export function isProForReputation(tenant: Pick<Tenant, 'plan_type' | 'plan_id'>): boolean {
  return resolveEffectivePlanType(tenant) === 'pro';
}

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

/** Sustituye {{nombre}}, {{propiedad}} y alias en inglés. */
export function fillGuestMessagePlaceholders(template: string, firstName: string, propertyName: string): string {
  const first = firstName.trim() || firstName;
  const prop = propertyName.trim() || propertyName;
  return template
    .replace(/\{\{\s*nombre\s*\}\}/gi, first)
    .replace(/\{\{\s*propiedad\s*\}\}/gi, prop)
    .replace(/\{\{\s*name\s*\}\}/gi, first)
    .replace(/\{\{\s*property\s*\}\}/gi, prop);
}

function splitMessageParagraphs(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  return t
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function bodyHtmlFromParagraphs(paragraphs: string[]): string {
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n  ');
}

/**
 * Resuelve el cuerpo (párrafos tras el saludo) para HTML y texto plano.
 */
function resolveGuestBodyParagraphs(
  locale: ReputationGuestLocale,
  guestMessage: string | undefined | null,
  first: string,
  prop: string
): string[] {
  const custom = (guestMessage || '').trim();
  const source =
    custom ||
    (locale === 'en' ? RECOMMENDED_GUEST_MESSAGE_EN : RECOMMENDED_GUEST_MESSAGE_ES);
  const filled = fillGuestMessagePlaceholders(source, first, prop);
  return splitMessageParagraphs(filled);
}

export function buildGoogleReviewReminderContent(args: {
  guestName: string;
  propertyName: string;
  reviewUrl: string;
  locale: ReputationGuestLocale;
  tenantBrandName: string;
  /** Si viene vacío o undefined, se usa el texto recomendado del idioma. */
  guestMessage?: string | null;
}): { subject: string; html: string; text: string } {
  const { guestName, propertyName, reviewUrl, locale, tenantBrandName, guestMessage } = args;
  const first = guestName.trim().split(/\s+/)[0] || guestName.trim();
  const prop = propertyName.trim() || (locale === 'en' ? 'your stay' : 'tu estancia');
  const brand = tenantBrandName.trim() || 'Delfín Check-in';
  const safeReview = escapeHtml(reviewUrl);

  const bodyParas = resolveGuestBodyParagraphs(locale, guestMessage, first, prop);
  const bodyHtml = bodyHtmlFromParagraphs(bodyParas);

  const ctaLabel = locale === 'en' ? 'Leave a Google review' : 'Dejar reseña en Google';
  const footerSmallHtml =
    locale === 'en'
      ? `This message was sent by ${escapeHtml(brand)} on behalf of your host.`
      : `Este mensaje lo envía ${escapeHtml(brand)} en nombre de tu anfitrión.`;
  const footerSmallText =
    locale === 'en'
      ? `This message was sent by ${brand} on behalf of your host.`
      : `Este mensaje lo envía ${brand} en nombre de tu anfitrión.`;
  const footerLinkHint =
    locale === 'en'
      ? 'If the button does not work, copy and paste this link into your browser:'
      : 'Si el botón no funciona, copia y pega este enlace en el navegador:';

  if (locale === 'en') {
    const subject = `How was your stay at ${prop}?`;
    const html = `
<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hi ${escapeHtml(first)},</p>
  ${bodyHtml}
  <p style="margin:28px 0;">
    <a href="${safeReview}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">${ctaLabel}</a>
  </p>
  <p style="font-size:14px;color:#6b7280;">${footerSmallHtml}</p>
  <p style="font-size:13px;color:#9ca3af;">${footerLinkHint}<br/><span style="word-break:break-all;">${safeReview}</span></p>
</body></html>`.trim();

    const textBody = bodyParas.join('\n\n');
    const text = `Hi ${first},\n\n${textBody}\n\n${ctaLabel}: ${reviewUrl}\n\n${footerSmallText}`;
    return { subject, html, text };
  }

  const subject = `¿Qué tal tu estancia en ${prop}?`;
  const html = `
<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hola ${escapeHtml(first)},</p>
  ${bodyHtml}
  <p style="margin:28px 0;">
    <a href="${safeReview}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">${ctaLabel}</a>
  </p>
  <p style="font-size:14px;color:#6b7280;">${footerSmallHtml}</p>
  <p style="font-size:13px;color:#9ca3af;">${footerLinkHint}<br/><span style="word-break:break-all;">${safeReview}</span></p>
</body></html>`.trim();

  const textBody = bodyParas.join('\n\n');
  const text = `Hola ${first},\n\n${textBody}\n\n${ctaLabel}: ${reviewUrl}\n\n${footerSmallText}`;
  return { subject, html, text };
}
