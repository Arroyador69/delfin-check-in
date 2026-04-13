'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Bell } from 'lucide-react';
import { useClientTranslations } from '@/hooks/useClientTranslations';

export default function PendingReservationReviewBadge() {
  const pathname = usePathname();
  const t = useClientTranslations('navigation');
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    fetch('/api/tenant/pending-reservations-review', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.count === 'number') setCount(d.count);
        else setCount(0);
      })
      .catch(() => setCount(0));
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  const hasPending = count > 0;
  const label = count > 9 ? '9+' : String(count);

  return (
    <Link
      href={hasPending ? '/reservations?review=pending' : '/reservations'}
      className={`relative inline-flex items-center justify-center rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
        hasPending
          ? 'text-amber-800 hover:bg-amber-50'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
      }`}
      title={hasPending ? t('pendingReservationsReviewTitle') : t('pendingReservationsReviewNoPending')}
      aria-label={
        hasPending ? t('pendingReservationsReviewAria', { count }) : t('pendingReservationsReviewNoPending')
      }
    >
      <Bell className="h-5 w-5 shrink-0" aria-hidden />
      {hasPending ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
          {label}
        </span>
      ) : null}
    </Link>
  );
}
