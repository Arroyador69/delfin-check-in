/**
 * Misma regla que web/API: envío automático MIR en ajustes solo con módulo legal
 * y plan distinto del básico gratuito (`free`).
 */
export function canTenantConfigureMirAutoSubmit(
  tenant: { legal_module?: boolean | null; plan_type?: string | null } | null | undefined
): boolean {
  if (!tenant?.legal_module) return false;
  const plan = String(tenant.plan_type || 'free').toLowerCase();
  if (plan === 'free') return false;
  return true;
}
