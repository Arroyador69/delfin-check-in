-- Idioma de la página de pago para el huésped (microsite book): 'es' | 'en'
ALTER TABLE payment_links
ADD COLUMN IF NOT EXISTS guest_locale VARCHAR(5) NOT NULL DEFAULT 'es';

COMMENT ON COLUMN payment_links.guest_locale IS 'Idioma de la UI del enlace de pago en book.delfincheckin.com: es | en';
