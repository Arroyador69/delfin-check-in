/**
 * Métricas del embudo lifecycle en superadmin.
 *
 * - plan_assigned: plan de pago configurado en tenants (manual, pruebas, Polar sin cobro aún).
 * - paying_customer: cobro verificado (evento payment_received, Polar activo o Stripe subscription).
 */

export const SQL_TENANT_PAID_PLAN_CONFIGURED = `
  plan_type IN ('checkin', 'standard', 'pro')
  OR plan_id IN ('standard', 'pro', 'enterprise', 'premium', 'checkin')
`;

export const SQL_TENANT_PAYING_CUSTOMER = `
  (
    NULLIF(TRIM(COALESCE(tenants.polar_subscription_id, '')), '') IS NOT NULL
    AND LOWER(COALESCE(tenants.polar_subscription_status, '')) IN ('active', 'trialing')
  )
  OR NULLIF(TRIM(COALESCE(tenants.stripe_subscription_id, '')), '') IS NOT NULL
  OR EXISTS (
    SELECT 1 FROM subscription_events se
    WHERE se.tenant_id = tenants.id
      AND se.event_type = 'payment_received'
  )
`;
