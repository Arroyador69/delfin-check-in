import { Suspense } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import BookingPageClient from '@/app/book/[tenantId]/[propertyId]/booking-page-client';
import type { BookGuestLang } from '@/lib/book-guest-i18n';
import {
  BOOK_TENANT_UUID_RE,
  isBookMicrositeRequestHost,
  isNumericPropertyId,
} from '@/lib/book-public-host';

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

function BookingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
    </div>
  );
}

/**
 * URL pública: https://book.delfincheckin.com/{tenantUuid}/{propertyId}?lang=en
 * Solo responde en host book.* (y localhost). Evita colisión con /es/dashboard en admin.
 */
export default async function BookPropertyRootPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; propertyId: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const h = await headers();
  const forwarded = h.get('x-forwarded-host');
  const host = forwarded ?? h.get('host');
  if (!isBookMicrositeRequestHost(host)) {
    notFound();
  }

  const { tenantId, propertyId } = await params;
  if (!BOOK_TENANT_UUID_RE.test(tenantId) || !isNumericPropertyId(propertyId)) {
    notFound();
  }

  const sp = await searchParams;
  const initialLangFromUrl = parseLangFromSearchParams(sp.lang);

  return (
    <Suspense fallback={<BookingFallback />}>
      <BookingPageClient params={params} initialLangFromUrl={initialLangFromUrl} />
    </Suspense>
  );
}
