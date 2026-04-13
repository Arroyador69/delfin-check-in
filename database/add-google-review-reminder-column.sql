-- Recordatorio de reseña Google tras reserva directa (plan Pro)
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
