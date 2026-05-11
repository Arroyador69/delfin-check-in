/** Email parcial para logs (evita PII completa en Vercel / inbox de errores). */
export function redactEmailForLog(email: string): string {
  const e = String(email || '').trim().toLowerCase();
  const at = e.indexOf('@');
  if (at < 1) return '[sin-email]';
  return `${e[0]}***${e.slice(at)}`;
}
