import { Suspense } from 'react';
import BookingPageClient from './booking-page-client';
import type { BookGuestLang } from '@/lib/book-guest-i18n';

function parseLangFromSearchParams(
  lang: string | string[] | undefined
): BookGuestLang | undefined {
  const raw = Array.isArray(lang) ? lang[0] : lang;
  const n = (raw || '').toLowerCase().trim();
  if (n === 'en') return 'en';
  if (n === 'es') return 'es';
  return undefined;
}

function BookingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
    </div>
  );
}

export default async function BookPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; propertyId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const sp = await searchParams;
  const initialLangFromUrl = parseLangFromSearchParams(sp.lang);

  return (
    <Suspense fallback={<BookingFallback />}>
      <BookingPageClient params={params} initialLangFromUrl={initialLangFromUrl} />
    </Suspense>
  );
}
