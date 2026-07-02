/**
 * Mensajes de consola que no deben persistirse en error_logs (Superadmin).
 * Son eventos esperados ya reflejados en BD/UI o ruido de seguridad (login fallido).
 */
const SKIP_DB_PATTERNS: RegExp[] = [
  /\[sync-calendars\]\s+Calendario requiere revisión/i,
  /Tenant no encontrado:/i,
  /Usuario no encontrado para tenant/i,
  /Login fallido/i,
  /Contraseña incorrecta para/i,
  /Rate limit exceeded for IP/i,
  /Credenciales inválidas/i,
];

export function shouldPersistConsoleLogToDb(message: string): boolean {
  const m = String(message || '').trim();
  if (!m) return true;
  return !SKIP_DB_PATTERNS.some((re) => re.test(m));
}
