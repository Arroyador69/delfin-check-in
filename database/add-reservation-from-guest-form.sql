-- Reservas generadas desde el registro de viajeros (formulario): enlace, revisión y canal
-- Ejecutar en Neon / Postgres (idempotente con IF NOT EXISTS).

ALTER TABLE guest_registrations
  ADD COLUMN IF NOT EXISTS linked_reservation_id UUID NULL;

-- FK tras asegurar columna (puede fallar si ya existe con otro nombre)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guest_registrations_linked_reservation_id_fkey'
  ) THEN
    ALTER TABLE guest_registrations
      ADD CONSTRAINT guest_registrations_linked_reservation_id_fkey
      FOREIGN KEY (linked_reservation_id) REFERENCES reservations(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS guest_registration_id UUID NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reservations_guest_registration_id
  ON reservations (guest_registration_id)
  WHERE guest_registration_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_guest_registration_id_fkey'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT reservations_guest_registration_id_fkey
      FOREIGN KEY (guest_registration_id) REFERENCES guest_registrations(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservations_needs_review_tenant
  ON reservations (tenant_id, needs_review)
  WHERE needs_review = true;

COMMENT ON COLUMN reservations.needs_review IS
  'True si la reserva viene del formulario de huéspedes y el propietario debe completar habitación, precios o canal.';
COMMENT ON COLUMN reservations.guest_registration_id IS
  'Registro de viajeros que originó esta reserva (si aplica).';
COMMENT ON COLUMN guest_registrations.linked_reservation_id IS
  'Reserva del panel vinculada a este registro (si se creó automáticamente).';

-- Ampliar canal para reservas creadas desde el formulario de check-in / viajeros
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_channel_check;
ALTER TABLE reservations
  ADD CONSTRAINT reservations_channel_check
  CHECK (channel IN ('airbnb', 'booking', 'manual', 'checkin_form'));
