import { Suspense } from 'react';
import BookingPageClient from './booking-page-client';

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
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  return (
    <Suspense fallback={<BookingFallback />}>
      <BookingPageClient params={params} initialLocale={lang} />
    </Suspense>
  );
}
