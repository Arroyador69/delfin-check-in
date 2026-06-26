import { Webhooks } from '@polar-sh/nextjs';
import { sql } from '@vercel/postgres';
import { provisionTenantFromPolarPublicSubscription } from '@/lib/polar-public-signup';
import {
  ensurePolarTenantColumns,
  syncTenantFromPolarSubscription,
} from '@/lib/polar-subscription-sync';

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
    await ensurePolarTenantColumns();

    try {
      const type = payload.type;

      if (type === 'checkout.created' || type === 'checkout.updated') {
        const checkout = payload.data as Record<string, unknown>;
        const tenantId =
          safeTenantIdFromMetadata(checkout?.metadata) ||
          safeTenantIdFromMetadata((checkout?.customer as Record<string, unknown> | undefined)?.metadata) ||
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
        const sub = payload.data;

        const syncResult = await syncTenantFromPolarSubscription(sub, type);

        if (syncResult.action === 'activated' || syncResult.action === 'downgraded') {
          return;
        }

        // Alta pública sin tenant (nuevo cliente desde landing/subscribe)
        if (type === 'subscription.active' && syncResult.detail === 'no_tenant') {
          await provisionTenantFromPolarPublicSubscription(sub);
        }
        return;
      }
    } catch (e) {
      console.error('❌ [polar webhook] Error procesando payload:', e);
    }
  },
});
