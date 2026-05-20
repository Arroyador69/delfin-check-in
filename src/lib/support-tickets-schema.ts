import { sql } from '@/lib/db';

/** Crea tablas/columnas de incidencias si faltan (Neon sin migración manual). */
export async function ensureSupportTicketsSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      created_by_user_id UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
      reporter_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      category VARCHAR(48) NOT NULL DEFAULT 'software_issue',
      status VARCHAR(24) NOT NULL DEFAULT 'open',
      superadmin_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  try {
    await sql`ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_code TEXT`;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_ticket_code
      ON support_tickets(ticket_code)
    `;
  } catch (_) {
    // índice único puede fallar si hay duplicados históricos
  }
  await sql`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON support_tickets(tenant_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender_type VARCHAR(16) NOT NULL,
      sender_email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT support_ticket_messages_sender_check CHECK (sender_type IN ('tenant', 'superadmin'))
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket
    ON support_ticket_messages(ticket_id, created_at ASC)
  `;
}
