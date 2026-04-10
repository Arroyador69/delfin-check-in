import { Suspense } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import PayLinkClient from '@/app/book/pay/[linkCode]/pay-link-client';
import type { BookGuestLang } from '@/lib/book-guest-i18n';
import { isBookMicrositeRequestHost } from '@/lib/book-public-host';

export const dynamic = 'force-dynamic';

function parseLangFromSearchParams(
  lang: string | string[] | undefined
): BookGuestLang | undefined {
  const raw = Array.isArray(lang) ? lang[0] : lang;
  const n = (raw || '').toLowerCase().trim();
  if (n === 'en') return 'en';
  if (n === 'es') return 'es';
  return undefined;
}

function PayFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>
  );
}

/**
 * URL pública: https://book.delfincheckin.com/pay/{code}?lang=en
 * Misma UI i18n que /book/pay/… (rutas /pay en la raíz para el dominio book).
 */
export default async function PayLinkRootPage({
  params,
  searchParams,
}: {
  params: Promise<{ linkCode: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const h = await headers();
  const forwarded = h.get('x-forwarded-host');
  const host = forwarded ?? h.get('host');
  if (!isBookMicrositeRequestHost(host)) {
    notFound();
  }

  const sp = await searchParams;
  const initialLangFromUrl = parseLangFromSearchParams(sp.lang);

  return (
    <Suspense fallback={<PayFallback />}>
      <PayLinkClient params={params} initialLangFromUrl={initialLangFromUrl} />
    </Suspense>
  );
}
