/**
 * En payment_links, is_active NULL se trata como activo en negocio (ver fix-payment-links-is-active-null.sql).
 * Solo false = desactivado explícitamente.
 */
export function paymentLinkIsActiveForUi(isActive: unknown): boolean {
  return isActive !== false;
}
