-- Recordatorio de reseña Google (plan Pro): reservas directas + reservas del panel (tabla reservations)
-- Ejecutar en Neon / Postgres del proyecto.

ALTER TABLE direct_reservations
  ADD COLUMN IF NOT EXISTS google_review_reminder_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN direct_reservations.google_review_reminder_sent_at IS
  'Cuándo se envió el email de recordatorio de reseña en Google (una vez por reserva).';

CREATE INDEX IF NOT EXISTS idx_direct_reservations_review_pending
  ON direct_reservations (tenant_id, check_out_date)
  WHERE google_review_reminder_sent_at IS NULL
    AND reservation_status = 'confirmed'
    AND payment_status = 'paid';

-- Panel de reservas (Airbnb, Booking, manual, etc.)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS google_review_reminder_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN reservations.google_review_reminder_sent_at IS
  'Cuándo se envió el email de recordatorio de reseña en Google (una vez por reserva del panel).';

CREATE INDEX IF NOT EXISTS idx_reservations_review_pending
  ON reservations (tenant_id, check_out)
  WHERE google_review_reminder_sent_at IS NULL
    AND status IS DISTINCT FROM 'cancelled';
