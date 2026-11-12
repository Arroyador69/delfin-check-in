import { SalesCallBookingClient } from './sales-call-booking-client';

export const dynamic = 'force-dynamic';

export default async function ReservaLlamadaPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};
  const emailRaw = sp.email;
  const srcRaw = sp.src;
  const email = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw;
  const source = Array.isArray(srcRaw) ? srcRaw[0] : srcRaw;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <p className="mb-6 text-lg font-bold text-sky-700">Delfín Check-in</p>
        <SalesCallBookingClient
          initialEmail={String(email || '').trim().toLowerCase()}
          source={String(source || '').trim() || undefined}
        />
      </div>
    </main>
  );
}
