import { sql } from '@vercel/postgres';
import { ensureTapWallSchema, isTapWallActiveStatus } from '@/lib/tap-wall';

function metaString(meta: unknown, key: string): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const v = (meta as Record<string, unknown>)[key];
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t || null;
}

export async function syncTapWallFromPolarSubscription(
  sub: Record<string, unknown>,
  eventType: string
): Promise<{ ok: boolean; detail?: string }> {
  await ensureTapWallSchema();

  const meta = sub.metadata;
  const source = metaString(meta, 'source');
  if (source !== 'tap_wall') {
    return { ok: false, detail: 'not_tap_wall' };
  }

  const tenantId = metaString(meta, 'tenant_id');
  const email = metaString(meta, 'email') || metaString((sub.customer as any)?.metadata, 'email');
  const accountId = metaString(meta, 'tap_account_id');
  const statusRaw = String(sub.status || '').toLowerCase();
  const mapped =
    eventType.includes('canceled') || eventType.includes('revoked')
      ? 'canceled'
      : isTapWallActiveStatus(statusRaw)
        ? 'active'
        : statusRaw || 'inactive';

  const polarSubId = sub.id ? String(sub.id) : null;
  const polarCustomerId = sub.customerId
    ? String(sub.customerId)
    : sub.customer_id
      ? String(sub.customer_id)
      : null;

  if (accountId) {
    await sql`
      UPDATE tap_wall_accounts
      SET status = ${mapped},
          polar_subscription_id = ${polarSubId},
          polar_customer_id = ${polarCustomerId},
          updated_at = NOW()
      WHERE id = ${accountId}::uuid
    `;
    return { ok: true, detail: 'updated_by_account' };
  }

  if (tenantId) {
    await sql`
      UPDATE tap_wall_accounts
      SET status = ${mapped},
          polar_subscription_id = ${polarSubId},
          polar_customer_id = ${polarCustomerId},
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid
    `;
    return { ok: true, detail: 'updated_by_tenant' };
  }

  if (email) {
    await sql`
      UPDATE tap_wall_accounts
      SET status = ${mapped},
          polar_subscription_id = ${polarSubId},
          polar_customer_id = ${polarCustomerId},
          updated_at = NOW()
      WHERE lower(email) = lower(${email})
    `;
    return { ok: true, detail: 'updated_by_email' };
  }

  return { ok: false, detail: 'no_match' };
}
