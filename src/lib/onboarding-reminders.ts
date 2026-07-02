import { sql } from '@/lib/db';

export type OnboardingDeferredTask = 'units' | 'mir' | 'stripe' | 'property_profile';

export const ONBOARDING_REMINDER_TYPE = 'onboarding_reminder';

/** body almacena el id de tarea para deduplicar y resolver */
export const ONBOARDING_DEFERRED_META: Record<
  OnboardingDeferredTask,
  { title: string; body: string; link: string }
> = {
  units: {
    title: 'Configura tus unidades',
    body: 'units',
    link: '/settings',
  },
  property_profile: {
    title: 'Completa la ficha de tu alojamiento',
    body: 'property_profile',
    link: '/settings/properties',
  },
  mir: {
    title: 'Configura el envío al Ministerio (MIR)',
    body: 'mir',
    link: '/settings/mir',
  },
  stripe: {
    title: 'Conecta pagos directos (Stripe)',
    body: 'stripe',
    link: '/settings/billing',
  },
};

export function isOnboardingDeferredTask(value: string): value is OnboardingDeferredTask {
  return value in ONBOARDING_DEFERRED_META;
}

export async function ensureTenantNotificationsSchema(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        type VARCHAR(48) NOT NULL DEFAULT 'generic',
        title TEXT NOT NULL,
        body TEXT,
        link TEXT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        read_at TIMESTAMPTZ
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tenant_notifications_tenant_unread
      ON tenant_notifications(tenant_id, is_read, created_at DESC)
    `;
  } catch {
    // best-effort
  }
}

/** Crea o renueva recordatorios en campanita para tareas aplazadas. */
export async function upsertOnboardingReminders(
  tenantId: string,
  tasks: string[]
): Promise<void> {
  const valid = tasks.filter(isOnboardingDeferredTask);
  if (!valid.length) return;

  await ensureTenantNotificationsSchema();

  for (const task of valid) {
    const meta = ONBOARDING_DEFERRED_META[task];
    const existing = await sql`
      SELECT id FROM tenant_notifications
      WHERE tenant_id = ${tenantId}::uuid
        AND type = ${ONBOARDING_REMINDER_TYPE}
        AND body = ${meta.body}
        AND is_read = FALSE
      LIMIT 1
    `;
    if (existing.rows.length > 0) continue;

    await sql`
      INSERT INTO tenant_notifications (tenant_id, type, title, body, link)
      VALUES (
        ${tenantId}::uuid,
        ${ONBOARDING_REMINDER_TYPE},
        ${meta.title},
        ${meta.body},
        ${meta.link}
      )
    `;
  }
}

/** Marca recordatorio como leído y quita la tarea de tenants.config.onboarding_deferred. */
export async function resolveOnboardingReminder(
  tenantId: string,
  task: OnboardingDeferredTask
): Promise<void> {
  await ensureTenantNotificationsSchema();

  const meta = ONBOARDING_DEFERRED_META[task];
  await sql`
    UPDATE tenant_notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE tenant_id = ${tenantId}::uuid
      AND type = ${ONBOARDING_REMINDER_TYPE}
      AND body = ${meta.body}
      AND is_read = FALSE
  `;

  const row = await sql`
    SELECT config FROM tenants WHERE id = ${tenantId}::uuid LIMIT 1
  `;
  const config = (row.rows[0]?.config as Record<string, unknown> | null) || {};
  const deferred = Array.isArray(config.onboarding_deferred)
    ? (config.onboarding_deferred as string[]).filter((t) => t !== task)
    : [];

  const patch = JSON.stringify({ onboarding_deferred: deferred });
  await sql`
    UPDATE tenants
    SET config = COALESCE(config, '{}'::jsonb) || ${patch}::jsonb,
        updated_at = NOW()
    WHERE id = ${tenantId}::uuid
  `;
}
