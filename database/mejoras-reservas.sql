-- ==========================================
-- MEJORAS TABLA RESERVATIONS - CAMPOS FALTANTES
-- Ejecutar en PostgreSQL de Vercel
-- ==========================================

-- Añadir campos que aparecen en tu dashboard
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_income DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS guest_paid DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS guest_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS special_requests TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_check_out ON reservations(check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_channel ON reservations(channel);
CREATE INDEX IF NOT EXISTS idx_reservations_guest_name ON reservations(guest_name);

-- Función para calcular ganancia neta automáticamente
CREATE OR REPLACE FUNCTION calculate_net_income()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular ganancia neta = precio total - comisión plataforma
    NEW.net_income = COALESCE(NEW.total_price, 0) - COALESCE(NEW.platform_commission, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular ganancia neta automáticamente
DROP TRIGGER IF EXISTS trigger_calculate_net_income ON reservations;
CREATE TRIGGER trigger_calculate_net_income
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_net_income();

-- Comentarios para documentación
COMMENT ON COLUMN reservations.platform_commission IS 'Comisión pagada a la plataforma (Airbnb, Booking, etc.)';
COMMENT ON COLUMN reservations.net_income IS 'Ganancia neta (calculada automáticamente = total_price - platform_commission)';
COMMENT ON COLUMN reservations.guest_paid IS 'Cantidad real pagada por el huésped';
COMMENT ON COLUMN reservations.payment_method IS 'Método de pago utilizado';
COMMENT ON COLUMN reservations.booking_reference IS 'Referencia de la reserva en la plataforma externa';
COMMENT ON COLUMN reservations.guest_phone IS 'Teléfono del huésped';
COMMENT ON COLUMN reservations.guest_country IS 'País del huésped';
COMMENT ON COLUMN reservations.special_requests IS 'Peticiones especiales del huésped';
COMMENT ON COLUMN reservations.internal_notes IS 'Notas internas del administrador';

-- Verificar estructura final
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reservations' 
ORDER BY ordinal_position;
