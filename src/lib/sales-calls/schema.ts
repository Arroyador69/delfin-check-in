import { sql } from '@/lib/db';

let ensured = false;

export async function ensureSalesCallBookingsSchema(): Promise<void> {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS sales_call_bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project TEXT NOT NULL DEFAULT 'delfin',
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ NOT NULL,
      duration_minutes INT NOT NULL DEFAULT 15,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      comments TEXT,
      meeting_url TEXT,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'confirmed',
      peer_mirror_id TEXT,
      manage_token TEXT,
      reminder_sent_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE sales_call_bookings ADD COLUMN IF NOT EXISTS manage_token TEXT`;
  await sql`ALTER TABLE sales_call_bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS sales_call_bookings_start_unique
      ON sales_call_bookings (start_at)
      WHERE status = 'confirmed'
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS sales_call_bookings_range_idx
      ON sales_call_bookings (start_at, end_at)
      WHERE status = 'confirmed'
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS sales_call_bookings_manage_token_uidx
      ON sales_call_bookings (manage_token)
      WHERE manage_token IS NOT NULL
  `;
  ensured = true;
}
