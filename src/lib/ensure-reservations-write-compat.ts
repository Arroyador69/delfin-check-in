import { sql } from '@/lib/db';

let reservationsChannelCompatDone = false;

/**
 * Neon/Postgres antiguos suelen tener CHECK (channel IN ('airbnb','booking','manual')).
 * La app móvil y la web envían 'direct', OTAs y canales custom — eso dispara NeonDbError al INSERT.
 * Quita cualquier CHECK sobre `channel` y deja uno solo por longitud (canales libres).
 */
export async function ensureReservationsChannelWriteCompat(): Promise<void> {
  if (reservationsChannelCompatDone) return;

  await sql.query(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      IF to_regclass('public.reservations') IS NULL THEN
        RETURN;
      END IF;
      FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'reservations'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%channel%'
      LOOP
        EXECUTE format('ALTER TABLE reservations DROP CONSTRAINT %I', r.conname);
      END LOOP;
    END $$;
  `);

  await sql.query(`
    ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_channel_len_check;
  `);

  await sql.query(`
    ALTER TABLE reservations
    ADD CONSTRAINT reservations_channel_len_check
    CHECK (
      channel IS NULL
      OR (
        char_length(trim(channel)) >= 1
        AND char_length(trim(channel)) <= 120
      )
    );
  `);

  reservationsChannelCompatDone = true;
}
