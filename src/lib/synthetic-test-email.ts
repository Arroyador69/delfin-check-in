/**
 * Emails sintéticos de smoke tests (no existen en Zoho).
 * Enviarles onboarding genera 550 Invalid recipients y ensucia el buzón.
 */
export function isSyntheticTestEmail(email: string): boolean {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  if (!e.includes('@')) return false;

  // Prefijos que usamos en pruebas de activate / Mirofish / checkout
  if (/^(prueba[-+.]|test[-+.]|smoke[-+.]|mirofish[-+.])/.test(e)) {
    return true;
  }

  // Buzones inventados en nuestro dominio (no hay MX local para esos locals)
  const [local, domain] = e.split('@');
  if (
    domain === 'delfincheckin.com' &&
    /^(prueba|test|smoke|mirofish|checkout-test|lite-test)/.test(local || '')
  ) {
    return true;
  }

  return false;
}
