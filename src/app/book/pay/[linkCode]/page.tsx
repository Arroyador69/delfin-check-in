import { Suspense } from 'react';
import PayLinkClient from './pay-link-client';
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

function PayFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>
  );
}

export default async function BookPaymentLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ linkCode: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const sp = await searchParams;
  const initialLangFromUrl = parseLangFromSearchParams(sp.lang);

  return (
    <Suspense fallback={<PayFallback />}>
      <PayLinkClient params={params} initialLangFromUrl={initialLangFromUrl} />
    </Suspense>
  );
}
