import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';

type Props = { params: Promise<{ locale: string }> };

/** Los canales de reserva están en Configuración general (/settings). */
export default async function BookingChannelsRedirectPage({ params }: Props) {
  const { locale } = await params;
  redirect({ href: '/settings', locale: locale as Locale });
}
