'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  type BookGuestLang,
  BOOK_LANG_COOKIE,
  bookLangFromCookie,
  parseBookGuestLang,
} from '@/lib/book-guest-i18n';

export type UseBookGuestLangOptions = {
  /** p. ej. guest_locale del enlace de pago cuando no hay ?lang= */
  defaultDb?: string | null;
  /** Lo que leyó el Server Component en searchParams (fiabilidad en 1er render / incógnito) */
  initialLangFromUrl?: BookGuestLang;
};

function normalizeLangParam(q: string | null | undefined): BookGuestLang | null {
  const n = (q ?? '').toLowerCase().trim();
  if (n === 'en' || n === 'es') return n;
  return null;
}

/**
 * Idioma UI del microsite: ?lang= (URL), cookie, default de BD, ES por defecto.
 */
export function useBookGuestLang(options?: UseBookGuestLangOptions | null): {
  lang: BookGuestLang;
  setLang: (l: BookGuestLang) => void;
} {
  const defaultDb = options?.defaultDb ?? null;
  const initialLangFromUrl = options?.initialLangFromUrl;
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const computeLang = useCallback((): BookGuestLang => {
    const fromSearch = normalizeLangParam(search.get('lang'));
    if (fromSearch) return fromSearch;

    if (typeof window !== 'undefined') {
      const fromWindow = normalizeLangParam(
        new URLSearchParams(window.location.search).get('lang')
      );
      if (fromWindow) return fromWindow;

      const fromC = bookLangFromCookie(document.cookie);
      if (fromC) return fromC;
    }

    return parseBookGuestLang(null, defaultDb);
  }, [search, defaultDb]);

  const [lang, setLang] = useState<BookGuestLang>(() => {
    if (initialLangFromUrl === 'en' || initialLangFromUrl === 'es') {
      return initialLangFromUrl;
    }
    return parseBookGuestLang(null, defaultDb);
  });

  useEffect(() => {
    setLang(computeLang());
  }, [computeLang]);

  const setLangUi = useCallback(
    (l: BookGuestLang) => {
      if (typeof document !== 'undefined') {
        document.cookie = `${BOOK_LANG_COOKIE}=${l};path=/;max-age=31536000;SameSite=Lax`;
      }
      const q = new URLSearchParams(search.toString());
      if (l === 'es') q.delete('lang');
      else q.set('lang', l);
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      setLang(l);
    },
    [pathname, router, search]
  );

  return { lang, setLang: setLangUi };
}
