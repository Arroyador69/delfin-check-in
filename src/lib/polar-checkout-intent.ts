import { sql } from '@vercel/postgres';

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
