import { redirect } from 'next/navigation';
import { salesCallBookingUrl } from '@/lib/sales-calls/constants';

export const dynamic = 'force-dynamic';

/** La reserva pública vive en la landing; el admin solo redirige. */
export default async function ReservaLlamadaRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};
  const emailRaw = sp.email;
  const srcRaw = sp.src;
  const email = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw;
  const source = Array.isArray(srcRaw) ? srcRaw[0] : srcRaw;
  redirect(
    salesCallBookingUrl({
      email: email ? String(email) : undefined,
      source: source ? String(source) : undefined,
    })
  );
}
