import { Suspense } from 'react';
import PayLinkClient from './pay-link-client';

function PayFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>
  );
}

export default async function BookPaymentLinkPage({
  params,
}: {
  params: Promise<{ linkCode: string }>;
}) {
  return (
    <Suspense fallback={<PayFallback />}>
      <PayLinkClient params={params} />
    </Suspense>
  );
}
