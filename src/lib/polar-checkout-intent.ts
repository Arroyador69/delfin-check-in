import { sql } from '@vercel/postgres';

export type PolarCheckoutIntent = {
  source: string;
  path: string;
  plan?: string;
  rooms?: number;
  interval?: string;
  extra_units?: number;
};

/** Registra quién intentó pagar (soporte si falla el checkout). */
export async function recordPolarCheckoutIntent(
  tenantId: string,
  intent: PolarCheckoutIntent
): Promise<void> {
  try {
    await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_last_upgrade_intent_at TIMESTAMPTZ`;
    await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_last_checkout_context JSONB`;
    await sql`
      UPDATE tenants
      SET polar_last_upgrade_intent_at = NOW(),
          polar_last_checkout_context = ${JSON.stringify(intent)}::jsonb
      WHERE id = ${tenantId}::uuid
    `;
  } catch {
    // No bloquear el flujo de pago.
  }
}

export async function getTenantContactForPolarLog(
  tenantId: string | null,
  customerExternalId?: string | null
): Promise<{ tenant_id: string | null; email: string | null; name: string | null }> {
  const id = tenantId || customerExternalId || null;
  if (!id) return { tenant_id: null, email: null, name: null };
  try {
    const r = await sql`
      SELECT id::text AS tenant_id, email, name
      FROM tenants
      WHERE id = ${id}::uuid
      LIMIT 1
    `;
    const row = r.rows[0] as { tenant_id?: string; email?: string; name?: string } | undefined;
    if (!row) return { tenant_id: id, email: null, name: null };
    return {
      tenant_id: row.tenant_id || id,
      email: row.email || null,
      name: row.name || null,
    };
  } catch {
    return { tenant_id: id, email: null, name: null };
  }
}
