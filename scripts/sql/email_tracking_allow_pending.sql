-- Rate-limit Zoho: el mailer deja el tracking en 'pending' para reintento.
-- Antes solo existían sent/delivered/opened/clicked/bounced/failed → NeonDbError.
ALTER TABLE email_tracking DROP CONSTRAINT IF EXISTS email_tracking_status_check;
ALTER TABLE email_tracking ADD CONSTRAINT email_tracking_status_check
  CHECK (
    status::text = ANY (
      ARRAY[
        'sent',
        'delivered',
        'opened',
        'clicked',
        'bounced',
        'failed',
        'pending'
      ]::text[]
    )
  );
