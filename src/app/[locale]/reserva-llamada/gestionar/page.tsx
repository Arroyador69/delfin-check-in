import { SalesCallManageClient } from './sales-call-manage-client';

export const dynamic = 'force-dynamic';

export default async function GestionarReservaLlamadaPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};
  const tokenRaw = sp.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <p className="mb-6 text-lg font-bold text-sky-700">Delfín Check-in</p>
        <SalesCallManageClient token={String(token || '').trim()} />
      </div>
    </main>
  );
}
