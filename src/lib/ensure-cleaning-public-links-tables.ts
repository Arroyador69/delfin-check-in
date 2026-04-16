import { sql } from '@vercel/postgres';

/**
 * Idempotente: crea las tablas de enlaces públicos de limpieza si no existen.
 * Equivale a database/cleaning-public-links.sql.
 */
export async function ensureCleaningPublicLinkTables(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS cleaning_public_links (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      label VARCHAR(255) NOT NULL,
      public_token VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_cleaning_public_links_token UNIQUE (public_token)
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_cleaning_public_links_tenant
    ON cleaning_public_links(tenant_id);
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS cleaning_link_rooms (
      link_id UUID NOT NULL REFERENCES cleaning_public_links(id) ON DELETE CASCADE,
      room_id VARCHAR(50) NOT NULL,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      PRIMARY KEY (link_id, room_id)
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_cleaning_link_rooms_tenant_room
    ON cleaning_link_rooms(tenant_id, room_id);
  `;
}
