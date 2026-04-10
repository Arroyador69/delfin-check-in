'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  type BookGuestLang,
  BOOK_LANG_COOKIE,
  bookLangFromCookie,
  parseBookGuestLang,
} from '@/lib/book-guest-i18n';

/**
 * Lee ?lang= de la URL, cookie book_guest_ui_lang, o defaultDb (p. ej. guest_locale del enlace).
 */
export function useBookGuestLang(defaultDb?: string | null): {
  lang: BookGuestLang;
  setLang: (l: BookGuestLang) => void;
} {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lang = useMemo(() => {
    const q = search.get('lang');
    if (q === 'en' || q === 'es') return q as BookGuestLang;
    if (mounted && typeof document !== 'undefined') {
      const fromC = bookLangFromCookie(document.cookie);
      if (fromC) return fromC;
    }
    return parseBookGuestLang(null, defaultDb);
  }, [search, defaultDb, mounted]);

  const setLang = useCallback(
    (l: BookGuestLang) => {
      if (typeof document !== 'undefined') {
        document.cookie = `${BOOK_LANG_COOKIE}=${l};path=/;max-age=31536000;SameSite=Lax`;
      }
      const q = new URLSearchParams(search.toString());
      if (l === 'es') q.delete('lang');
      else q.set('lang', l);
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, search]
  );

  return { lang, setLang };
}
