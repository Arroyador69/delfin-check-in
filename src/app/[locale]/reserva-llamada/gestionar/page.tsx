import { redirect } from 'next/navigation';
import { salesCallManageUrl } from '@/lib/sales-calls/constants';

export const dynamic = 'force-dynamic';

export default async function GestionarReservaRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};
  const tokenRaw = sp.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
  if (!token) {
    redirect('https://delfincheckin.com/reserva-llamada/');
  }
  redirect(salesCallManageUrl(String(token)));
}