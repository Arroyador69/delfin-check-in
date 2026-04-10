import { Suspense } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import PayLinkClient from '@/app/book/pay/[linkCode]/pay-link-client';
import { isBookMicrositeRequestHost } from '@/lib/book-public-host';

export const dynamic = 'force-dynamic';

function PayFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>
  );
}

/**
 * URL pública: https://book.delfincheckin.com/pay/{code}
 * (misma UI que /book/pay/…; solo host microsite).
 */
export default async function PayLinkRootPage({
  params,
}: {
  params: Promise<{ linkCode: string }>;
}) {
  const h = await headers();
  const forwarded = h.get('x-forwarded-host');
  const host = forwarded ?? h.get('host');
  if (!isBookMicrositeRequestHost(host)) {
    notFound();
  }

  return (
    <Suspense fallback={<PayFallback />}>
      <PayLinkClient params={params} />
    </Suspense>
  );
}
