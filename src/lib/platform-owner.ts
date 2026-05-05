/**
 * SuperAdmin de plataforma: solo cuentas explícitamente permitidas por email.
 * Variable de entorno (coma = varios, p. ej. staging): DELFIN_PLATFORM_OWNER_EMAIL
 * Por defecto: contacto@delfincheckin.com
 *
 * El JWT puede incluir is_platform_admin desde BD; aquí se exige además el email
 * permitido para que un flag erróneo en BD no abra /superadmin a otras cuentas.
 */

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getPlatformOwnerEmails(): string[] {
  const raw =
    process.env.DELFIN_PLATFORM_OWNER_EMAIL?.trim() ||
    'contacto@delfincheckin.com'
  return raw
    .split(',')
    .map((s) => normalizeEmail(s))
    .filter(Boolean)
}

export function isPlatformOwnerEmail(email: string | null | undefined): boolean {
  if (!email || !String(email).includes('@')) return false
  const n = normalizeEmail(String(email))
  return getPlatformOwnerEmails().some((o) => o === n)
}

/** true solo si el token marca admin de plataforma y el email está en la lista permitida */
export function effectivePlatformAdmin(
  isPlatformAdminFromToken: boolean | undefined,
  email: string | null | undefined
): boolean {
  return Boolean(isPlatformAdminFromToken && isPlatformOwnerEmail(email))
}

export function isEffectiveSuperAdminPayload(
  payload: { isPlatformAdmin?: boolean; email?: string } | null | undefined
): boolean {
  if (!payload) return false
  return effectivePlatformAdmin(payload.isPlatformAdmin, payload.email)
}
