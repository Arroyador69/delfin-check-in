'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Bell } from 'lucide-react';
import { useClientTranslations, getCurrentLocale } from '@/hooks/useClientTranslations';
import { toIntlDateLocale, type Locale as AppLocale } from '@/i18n/config';

type PendingItem = { id: string; guest_name: string; check_in: string | null };

export default function PendingReservationReviewBadge() {
  const pathname = usePathname();
  const t = useClientTranslations('navigation');
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetch('/api/tenant/pending-reservations-review', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.count === 'number') setCount(d.count);
        else setCount(0);
        if (Array.isArray(d.items)) setItems(d.items as PendingItem[]);
        else setItems([]);
      })
      .catch(() => {
        setCount(0);
        setItems([]);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

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

  const hasPending = count > 0;
  const label = count > 9 ? '9+' : String(count);
  const locale = getCurrentLocale() as AppLocale;

  const formatCheckIn = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(toIntlDateLocale(locale), { dateStyle: 'medium' });
    } catch {
      return '—';
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          load();
        }}
        className={`relative inline-flex items-center justify-center rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
          hasPending
            ? 'text-amber-800 hover:bg-amber-50'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        }`}
        title={hasPending ? t('pendingReservationsReviewTitle') : t('pendingReservationsReviewNoPending')}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('pendingReservationsReviewMenuAria')}
      >
        <Bell className="h-5 w-5 shrink-0" aria-hidden />
        {hasPending ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {label}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-[60] mt-1 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          role="menu"
          aria-label={t('pendingReservationsReviewDropdownTitle')}
        >
          <div className="border-b border-gray-100 bg-amber-50/80 px-3 py-2 text-xs font-semibold text-amber-900">
            {t('pendingReservationsReviewDropdownTitle')}
          </div>
          <div className="max-h-[min(18rem,50vh)] overflow-y-auto py-1">
            {hasPending && items.length > 0 ? (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={`/reservations?editReservation=${encodeURIComponent(item.id)}`}
                  role="menuitem"
                  className="block px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-amber-50"
                  onClick={() => setOpen(false)}
                >
                  <span className="block font-medium leading-tight">{item.guest_name}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {t('pendingReservationsReviewCheckIn')}: {formatCheckIn(item.check_in)}
                  </span>
                </Link>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-sm text-gray-500">
                {t('pendingReservationsReviewNoPending')}
              </p>
            )}
          </div>
          <div className="border-t border-gray-100 bg-gray-50/90 px-2 py-2">
            <Link
              href={hasPending ? '/reservations?review=pending' : '/reservations'}
              role="menuitem"
              className="block rounded-lg px-2 py-2 text-center text-sm font-medium text-amber-800 hover:bg-amber-100/80"
              onClick={() => setOpen(false)}
            >
              {hasPending ? t('pendingReservationsReviewViewAll') : t('pendingReservationsReviewGoReservations')}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
