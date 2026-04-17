/** https://wa.me/... a partir de un número guardado (E.164 o texto con dígitos). */
export function waMeUrlFromStoredPhone(raw: string | null | undefined): string | null {
  if (!raw || !String(raw).trim()) return null;
  const d = String(raw).replace(/\D/g, '');
  if (d.length < 8) return null;
  return `https://wa.me/${d}`;
}
