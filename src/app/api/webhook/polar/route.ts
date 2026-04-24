import { Webhooks } from '@polar-sh/nextjs';
import { sql } from '@vercel/postgres';

async function ensurePolarColumns(): Promise<void> {
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_customer_id TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_checkout_id TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_subscription_status TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_last_event_at TIMESTAMP`;
}

function safeTenantIdFromMetadata(meta: unknown): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const tenantId = (meta as Record<string, unknown>).tenant_id;
  if (typeof tenantId !== 'string') return null;
  const trimmed = tenantId.trim();
  return trimmed ? trimmed : null;
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    await ensurePolarColumns();

    // Polar puede incluir metadata en checkout/order/subscription dependiendo del flujo.
    // Para MVP: usamos metadata.tenant_id (cuando viene) y, si no, dejamos el evento sin persistencia.
    try {
      const type = payload.type;

      if (type === 'checkout.created' || type === 'checkout.updated') {
        const checkout = payload.data as any;
        const tenantId =
          safeTenantIdFromMetadata(checkout?.metadata) ||
          safeTenantIdFromMetadata(checkout?.customer?.metadata) ||
          null;
        if (!tenantId) return;

        await sql`
          UPDATE tenants
          SET polar_checkout_id = ${String(checkout.id)},
              polar_customer_id = ${checkout.customer_id ? String(checkout.customer_id) : null},
              polar_last_event_at = NOW()
          WHERE id = ${tenantId}::uuid
        `;
        return;
      }

      if (
        type === 'subscription.created' ||
        type === 'subscription.updated' ||
        type === 'subscription.active' ||
        type === 'subscription.canceled' ||
        type === 'subscription.revoked' ||
        type === 'subscription.uncanceled'
      ) {
        const sub = payload.data as any;
        const tenantId =
          safeTenantIdFromMetadata(sub?.metadata) ||
          safeTenantIdFromMetadata(sub?.customer?.metadata) ||
          safeTenantIdFromMetadata(sub?.checkout?.metadata) ||
          null;
        if (!tenantId) return;

        const status = sub?.status ? String(sub.status) : String(type);
        await sql`
          UPDATE tenants
          SET polar_subscription_id = ${String(sub.id)},
              polar_customer_id = ${sub.customer_id ? String(sub.customer_id) : null},
              polar_subscription_status = ${status},
              polar_last_event_at = NOW()
          WHERE id = ${tenantId}::uuid
        `;
        return;
      }
    } catch (e) {
      // No debemos tumbar el webhook por un fallo de persistencia.
      console.error('❌ [polar webhook] Error procesando payload:', e);
    }
  },
});

