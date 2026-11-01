import { sql } from '@/lib/db';
import { stopSequenceByEmail } from './sequence-db';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Marca lead outreach como dado de alta (prueba gratis / waitlist activate). */
export async function markPublicOwnerLeadSignedUp(params: {
  email: string;
  tenantId?: string | null;
}): Promise<boolean> {
  const email = params.email.trim().toLowerCase();
  if (!email) return false;
  const tenantId =
    typeof params.tenantId === 'string' && UUID_RE.test(params.tenantId.trim())
      ? params.tenantId.trim()
      : null;

  try {
    const meta = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
    if (!meta.rows[0]?.reg) return false;

    const result = tenantId
      ? await sql`
          UPDATE public_owner_leads
          SET
            signed_up_at = COALESCE(signed_up_at, NOW()),
            signed_up_tenant_id = COALESCE(signed_up_tenant_id, ${tenantId}::uuid),
            updated_at = NOW(),
            notes = COALESCE(notes, '') || ' | signup'
          WHERE LOWER(TRIM(email)) = ${email}
            AND signed_up_at IS NULL
          RETURNING id
        `
      : await sql`
          UPDATE public_owner_leads
          SET
            signed_up_at = COALESCE(signed_up_at, NOW()),
            updated_at = NOW(),
            notes = COALESCE(notes, '') || ' | signup'
          WHERE LOWER(TRIM(email)) = ${email}
            AND signed_up_at IS NULL
          RETURNING id
        `;
    // Venta atribuida → parar follow-ups (incluso si signed_up_at ya estaba marcado)
    await stopSequenceByEmail(email, 'stopped_sale');
    return (result.rowCount || 0) > 0;
  } catch (e) {
    console.warn('[public-owner-leads] markSignedUp:', e instanceof Error ? e.message : e);
    return false;
  }
}
