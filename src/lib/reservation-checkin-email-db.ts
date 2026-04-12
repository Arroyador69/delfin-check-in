import { sql } from '@vercel/postgres';

export async function ensureReservationCheckinEmailColumns(): Promise<void> {
  await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checkin_instructions_sent_at TIMESTAMPTZ`;
  await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checkin_instructions_opened_at TIMESTAMPTZ`;
  await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checkin_instructions_track_token UUID`;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_reservations_checkin_track_token
    ON reservations(checkin_instructions_track_token)
    WHERE checkin_instructions_track_token IS NOT NULL
  `;
}
