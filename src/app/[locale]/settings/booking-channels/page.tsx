import { redirect } from '@/i18n/navigation';

/** Los canales de reserva están en Configuración general (/settings). */
export default function BookingChannelsRedirectPage() {
  redirect('/settings');
}
