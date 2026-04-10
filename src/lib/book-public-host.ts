/**
 * Rutas públicas de reserva/pago solo deben usarse en el host del microsite (y en local).
 * Evita que /pay/… en admin sirva la UI de pago del microsite por error.
 */
export function isBookMicrositeRequestHost(hostHeader: string | null | undefined): boolean {
  if (!hostHeader) return false;
  const host = hostHeader.split(':')[0].toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return true;
  }
  if (host === 'book.delfincheckin.com' || host === 'book.staging.delfincheckin.com') {
    return true;
  }
  if (host.startsWith('book.') && host.includes('delfincheckin.com')) {
    return true;
  }
  return false;
}
