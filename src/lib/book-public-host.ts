/**
 * Rutas públicas de reserva/pago solo deben usarse en el host del microsite (y en local).
 * Evita que /pay/… o /{uuid}/{id} en admin.delfincheckin.com sirvan UI equivocada.
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

export const BOOK_TENANT_UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isNumericPropertyId(id: string): boolean {
  return /^\d+$/.test(id);
}
