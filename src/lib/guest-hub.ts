import { sql } from '@/lib/db';

export type GuestHubConfig = {
  enabled?: boolean;
  whatsapp?: string;
  instructions?: string;
  welcomeTitle?: string;
};

export type GuestHubPublicPayload = {
  propertyName: string;
  tenantName: string;
  welcomeTitle: string;
  instructions: string;
  whatsapp: string | null;
};

export async function getGuestHubPublicBySlug(slug: string): Promise<GuestHubPublicPayload | null> {
  const clean = String(slug || '').trim().toLowerCase();
  if (!clean || clean.length > 64) return null;

  try {
    await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS guest_hub JSONB DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS guest_hub_slug VARCHAR(64)`;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_properties_guest_hub_slug_unique
      ON tenant_properties (guest_hub_slug)
      WHERE guest_hub_slug IS NOT NULL
    `;
  } catch {
    /* ignore */
  }

  const result = await sql`
    SELECT
      tp.property_name,
      tp.guest_hub,
      t.name AS tenant_name
    FROM tenant_properties tp
    JOIN tenants t ON t.id = tp.tenant_id::uuid
    WHERE tp.guest_hub_slug IS NOT NULL
      AND lower(trim(tp.guest_hub_slug)) = ${clean}
      AND tp.guest_hub IS NOT NULL
      AND COALESCE((tp.guest_hub->>'enabled')::boolean, false) IS TRUE
    LIMIT 1
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as {
    property_name: string;
    tenant_name: string;
    guest_hub: GuestHubConfig | null;
  };

  const gh = (row.guest_hub || {}) as GuestHubConfig;

  return {
    propertyName: row.property_name || '—',
    tenantName: row.tenant_name || '—',
    welcomeTitle: (gh.welcomeTitle || '').trim() || row.property_name || 'Guest Hub',
    instructions: (gh.instructions || '').trim(),
    whatsapp: (gh.whatsapp || '').trim() || null,
  };
}
