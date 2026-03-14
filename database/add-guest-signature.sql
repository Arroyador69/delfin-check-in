-- Add signature fields to guest_registrations table
-- Required by SES.Hospedajes (RD 933/2021)

ALTER TABLE guest_registrations ADD COLUMN IF NOT EXISTS signature_data TEXT;
ALTER TABLE guest_registrations ADD COLUMN IF NOT EXISTS signature_date TIMESTAMP WITH TIME ZONE;
