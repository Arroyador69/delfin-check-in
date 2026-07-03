/**
 * Rutas y etiquetas de notificaciones de onboarding (web + móvil).
 * Sin dependencias de DB — testeable en CI con Vitest.
 */
export type OnboardingDeferredTask = 'company' | 'units' | 'mir' | 'stripe' | 'property_profile';

const ONBOARDING_TASKS = new Set<string>(['company', 'units', 'mir', 'stripe', 'property_profile']);

export function isOnboardingDeferredTask(value: string | null | undefined): value is OnboardingDeferredTask {
  return Boolean(value && ONBOARDING_TASKS.has(value));
}

/** Ruta Expo Router al pulsar un recordatorio de onboarding. */
export function onboardingReminderMobileRoute(taskBody: string | null | undefined): string {
  switch (taskBody) {
    case 'company':
      return '/(app)/settings/company';
    case 'units':
      return '/(app)/settings/general';
    case 'property_profile':
      return '/(app)/settings/properties';
    case 'mir':
      return '/(app)/settings/mir';
    case 'stripe':
      return '/(app)/settings/billing';
    default:
      return '/(app)/settings';
  }
}

/** Clave i18n (mobile.notifications.*) para el menú de la campanita. */
export function onboardingReminderMobileLabelKey(
  taskBody: string | null | undefined
): string | null {
  switch (taskBody) {
    case 'company':
      return 'mobile.notifications.onboardingCompany';
    case 'units':
      return 'mobile.notifications.onboardingUnits';
    case 'property_profile':
      return 'mobile.notifications.onboardingProperty';
    case 'mir':
      return 'mobile.notifications.onboardingMir';
    case 'stripe':
      return 'mobile.notifications.onboardingStripe';
    default:
      return null;
  }
}

export type TenantNotificationLike = {
  id: string;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  link?: string | null;
  is_read?: boolean | null;
};

export function isUnreadTenantNotification(n: TenantNotificationLike): boolean {
  return n.is_read === false || n.is_read == null;
}

/** Extrae el UUID del ticket desde el link de notificación de soporte. */
export function supportTicketIdFromNotificationLink(link: string | null | undefined): string | null {
  const s = String(link || '');
  const m = s.match(/[?&]ticket=([^&]+)/);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export function tenantNotificationMobileRoute(n: TenantNotificationLike): string {
  const type = String(n.type || '');
  if (type === 'onboarding_reminder') {
    return onboardingReminderMobileRoute(n.body);
  }
  if (type === 'support_reply') {
    const ticketId = supportTicketIdFromNotificationLink(n.link);
    if (ticketId) {
      return `/(app)/settings/support?ticket=${encodeURIComponent(ticketId)}`;
    }
    return '/(app)/settings/support';
  }
  if (type === 'guest_registration' || type === 'reservation_created' || type === 'reservation_updated') {
    return '/(app)/reservations';
  }
  if (type === 'product_update') {
    return '/(app)/settings';
  }
  return '/(app)/reservations';
}

export function tenantNotificationMobileLabelKey(n: TenantNotificationLike): string | null {
  const type = String(n.type || '');
  if (type === 'onboarding_reminder') {
    return onboardingReminderMobileLabelKey(n.body);
  }
  if (type === 'support_reply') {
    return 'mobile.notifications.supportReply';
  }
  if (type === 'guest_registration') {
    return 'mobile.notifications.guestRegistration';
  }
  if (type === 'product_update') {
    return 'mobile.notifications.productUpdate';
  }
  return null;
}
