'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useClientTranslations, getCurrentLocale } from '@/hooks/useClientTranslations';
import { toIntlDateLocale, type Locale as AppLocale } from '@/i18n/config';

type PendingItem = { id: string; guest_name: string; check_in: string | null };

type NotificationItem = {
  id: string;
  type?: string;
  title: string;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
};

export default function UnifiedTenantBell() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useClientTranslations('navigation');
  const locale = getCurrentLocale() as AppLocale;

  const [pendingCount, setPendingCount] = useState(0);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  const [notifCount, setNotifCount] = useState(0);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const loadPending = useCallback(() => {
    fetch('/api/tenant/pending-reservations-review', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setPendingCount(typeof d.count === 'number' ? d.count : 0);
        setPendingItems(Array.isArray(d.items) ? (d.items as PendingItem[]) : []);
      })
      .catch(() => {
        setPendingCount(0);
        setPendingItems([]);
      });
  }, []);

  const loadNotifs = useCallback(() => {
    fetch('/api/tenant/notifications', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setNotifCount(typeof d.unreadCount === 'number' ? d.unreadCount : 0);
        setNotifs(Array.isArray(d.items) ? (d.items as NotificationItem[]) : []);
      })
      .catch(() => {
        setNotifCount(0);
        setNotifs([]);
      });
  }, []);

  const loadAll = useCallback(() => {
    loadPending();
    loadNotifs();
  }, [loadPending, loadNotifs]);

  const normalizeTenantLink = useCallback(
    (raw: string) => {
      const link = String(raw || '').trim();
      if (!link.startsWith('/')) return '/settings/support';
      // Si ya viene con /es/... o /en/... no tocar
      const parts = link.split('/').filter(Boolean);
      const first = parts[0];
      if (first && first.length === 2) return link;
      // En tenant app siempre navegamos con prefijo de locale
      return `/${locale}${link}`;
    },
    [locale]
  );

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      try {
        await fetch('/api/tenant/notifications', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
      } catch {
        // silencioso
      } finally {
        loadNotifs();
      }
    },
    [loadNotifs]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll, pathname]);

  // Polling suave: si llega una respuesta de soporte sin navegar, que aparezca igualmente.
  useEffect(() => {
    const id = window.setInterval(() => {
      loadAll();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [loadAll]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const formatCheckIn = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(toIntlDateLocale(locale), { dateStyle: 'medium' });
    } catch {
      return '—';
    }
  };

  const onboardingReminderLabel = (taskBody?: string | null) => {
    switch (taskBody) {
      case 'company':
        return t('notificationsOnboardingCompany');
      case 'units':
        return t('notificationsOnboardingUnits');
      case 'property_profile':
        return t('notificationsOnboardingProperty');
      case 'mir':
        return t('notificationsOnboardingMir');
      case 'stripe':
        return t('notificationsOnboardingStripe');
      default:
        return null;
    }
  };

  const unreadTotal = pendingCount + notifCount;
  const hasUnread = unreadTotal > 0;
  const label = unreadTotal > 9 ? '9+' : String(unreadTotal);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          loadAll();
        }}
        className={`relative inline-flex items-center justify-center rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
          hasUnread
            ? 'text-amber-800 hover:bg-amber-50'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        }`}
        title={hasUnread ? t('notificationsTitleUnread') : t('notificationsTitleNone')}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('notificationsAria')}
      >
        <Bell className="h-5 w-5 shrink-0" aria-hidden />
        {hasUnread ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {label}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[85vw] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">{t('notificationsTitle')}</div>
            {notifCount > 0 ? (
              <button
                type="button"
                className="text-xs text-slate-600 hover:text-slate-900"
                onClick={() => markRead(notifs.filter((i) => !i.is_read).map((i) => i.id))}
              >
                {t('notificationsMarkAllRead')}
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-auto">
            {/* Reservas por revisar */}
            <div className="border-b border-slate-100 bg-amber-50/60 px-4 py-2 text-xs font-semibold text-amber-900">
              {t('pendingReservationsReviewDropdownTitle')}
            </div>
            {pendingCount > 0 && pendingItems.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {pendingItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-amber-50"
                      onClick={() => {
                        router.push(`/reservations?editReservation=${encodeURIComponent(item.id)}`);
                        setOpen(false);
                      }}
                    >
                      <div className="text-sm font-semibold text-slate-900">{item.guest_name}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {t('pendingReservationsReviewCheckIn')}: {formatCheckIn(item.check_in)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-3 text-sm text-slate-500">{t('pendingReservationsReviewNoPending')}</div>
            )}

            {/* Notificaciones (soporte + actualizaciones) */}
            <div className="border-t border-slate-100 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
              {t('notificationsTitle')}
            </div>
            {notifs.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">{t('notificationsEmpty')}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifs.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${
                        n.is_read ? 'bg-white' : 'bg-amber-50/30'
                      }`}
                      onClick={() => {
                        const link = normalizeTenantLink(n.link || '/settings/support');
                        markRead([n.id]);
                        router.push(link);
                        setOpen(false);
                      }}
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        {n.type === 'support_reply'
                          ? t('notificationsSupportReply')
                          : n.type === 'product_update'
                            ? t('notificationsProductUpdate')
                            : n.type === 'onboarding_reminder'
                              ? onboardingReminderLabel(n.body) || n.title
                              : n.title}
                      </div>
                      {n.body && n.type !== 'onboarding_reminder' ? (
                        <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</div>
                      ) : null}
                      <div className="text-[11px] text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

