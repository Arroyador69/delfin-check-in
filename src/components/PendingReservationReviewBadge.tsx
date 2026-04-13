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
        if (typeof d.count === 'number' && d.count > 0) setCount(d.count);
        else setCount(0);
      })
      .catch(() => setCount(0));
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  if (count < 1) return null;

  const label = count > 9 ? '9+' : String(count);

  return (
    <Link
      href="/reservations?review=pending"
      className="relative inline-flex items-center justify-center rounded-lg p-2 text-amber-800 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
      title={t('pendingReservationsReviewTitle')}
      aria-label={t('pendingReservationsReviewAria', { count })}
    >
      <Bell className="h-5 w-5 shrink-0" aria-hidden />
      <span className="absolute -top-0.5 -right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
        {label}
      </span>
    </Link>
  );
}
