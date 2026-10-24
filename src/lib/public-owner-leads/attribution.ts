import { sql } from '@/lib/db';

/** Marca lead outreach como dado de alta (prueba gratis / waitlist activate). */
export async function markPublicOwnerLeadSignedUp(params: {
  email: string;
  tenantId?: string | null;
}): Promise<boolean> {
  const email = params.email.trim().toLowerCase();
  if (!email) return false;

  try {
    const meta = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
    if (!meta.rows[0]?.reg) return false;

    const result = await sql`
      UPDATE public_owner_leads
      SET
        signed_up_at = COALESCE(signed_up_at, NOW()),
        signed_up_tenant_id = COALESCE(signed_up_tenant_id, ${params.tenantId || null}::uuid),
        updated_at = NOW(),
        notes = COALESCE(notes, '') || ' | signup'
      WHERE LOWER(TRIM(email)) = ${email}
        AND signed_up_at IS NULL
      RETURNING id
    `;
    return (result.rowCount || 0) > 0;
  } catch (e) {
    console.warn('[public-owner-leads] markSignedUp:', e);
    return false;
  }
}
