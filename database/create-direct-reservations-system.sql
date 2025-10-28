-- =====================================================
-- SISTEMA DE RESERVAS DIRECTAS MULTITENANT
-- =====================================================

-- Tabla de propiedades por tenant
CREATE TABLE IF NOT EXISTS tenant_properties (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  property_name VARCHAR(255) NOT NULL,
  description TEXT,
  photos JSONB DEFAULT '[]'::jsonb, -- Array de URLs de fotos
  max_guests INTEGER DEFAULT 2,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  amenities JSONB DEFAULT '[]'::jsonb, -- Array de comodidades
  base_price DECIMAL(10,2) NOT NULL DEFAULT 50.00, -- Precio base por noche
  cleaning_fee DECIMAL(10,2) DEFAULT 0.00,
  security_deposit DECIMAL(10,2) DEFAULT 0.00,
  minimum_nights INTEGER DEFAULT 1,
  maximum_nights INTEGER DEFAULT 30,
  availability_rules JSONB DEFAULT '{}'::jsonb, -- Reglas de disponibilidad
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para optimización
  CONSTRAINT fk_tenant_properties_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Tabla de disponibilidad de propiedades
CREATE TABLE IF NOT EXISTS property_availability (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  date DATE NOT NULL,
  available BOOLEAN DEFAULT true,
  price_override DECIMAL(10,2), -- Precio especial para esa fecha
  minimum_nights INTEGER DEFAULT 1,
  blocked_reason VARCHAR(255), -- Razón del bloqueo
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para optimización
  CONSTRAINT fk_property_availability_property FOREIGN KEY (property_id) REFERENCES tenant_properties(id) ON DELETE CASCADE,
  UNIQUE(property_id, date)
);

-- Tabla de reservas directas
CREATE TABLE IF NOT EXISTS direct_reservations (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  property_id INTEGER NOT NULL,
  reservation_code VARCHAR(50) UNIQUE NOT NULL, -- Código único de reserva
  
  -- Información del huésped
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(255),
  guest_document_type VARCHAR(50),
  guest_document_number VARCHAR(255),
  guest_nationality VARCHAR(100),
  
  -- Detalles de la reserva
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INTEGER NOT NULL,
  guests INTEGER NOT NULL,
  
  -- Precios y comisiones
  base_price DECIMAL(10,2) NOT NULL,
  cleaning_fee DECIMAL(10,2) DEFAULT 0.00,
  security_deposit DECIMAL(10,2) DEFAULT 0.00,
  subtotal DECIMAL(10,2) NOT NULL, -- Precio total sin comisiones
  delfin_commission_rate DECIMAL(5,4) DEFAULT 0.0900, -- 9% de comisión
  delfin_commission_amount DECIMAL(10,2) NOT NULL, -- Cantidad de comisión
  stripe_fee_amount DECIMAL(10,2) DEFAULT 0.00, -- Comisión de Stripe
  property_owner_amount DECIMAL(10,2) NOT NULL, -- Lo que recibe el propietario
  total_amount DECIMAL(10,2) NOT NULL, -- Total que paga el huésped
  
  -- Información de pago
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
  payment_method VARCHAR(50), -- card, bank_transfer, etc.
  
  -- Estado de la reserva
  reservation_status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, cancelled, completed
  special_requests TEXT,
  internal_notes TEXT, -- Notas internas del propietario
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  -- Índices para optimización
  CONSTRAINT fk_direct_reservations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_direct_reservations_property FOREIGN KEY (property_id) REFERENCES tenant_properties(id) ON DELETE CASCADE
);

-- Tabla de transacciones de comisiones
CREATE TABLE IF NOT EXISTS commission_transactions (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- commission, refund, adjustment
  amount DECIMAL(10,2) NOT NULL,
  stripe_fee DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL, -- Cantidad neta después de Stripe
  stripe_transfer_id VARCHAR(255), -- ID de transferencia a propietario
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_commission_transactions_reservation FOREIGN KEY (reservation_id) REFERENCES direct_reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_commission_transactions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Tabla de configuración de comisiones por tenant
CREATE TABLE IF NOT EXISTS tenant_commission_settings (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) UNIQUE NOT NULL,
  commission_rate DECIMAL(5,4) DEFAULT 0.0900, -- 9% por defecto
  stripe_fee_rate DECIMAL(5,4) DEFAULT 0.0140, -- 1.4% + 0.25€ por defecto
  minimum_commission DECIMAL(10,2) DEFAULT 1.00, -- Comisión mínima
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_tenant_commission_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para tenant_properties
CREATE INDEX IF NOT EXISTS idx_tenant_properties_tenant_id ON tenant_properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_properties_active ON tenant_properties(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_properties_price ON tenant_properties(base_price);

-- Índices para property_availability
CREATE INDEX IF NOT EXISTS idx_property_availability_property_id ON property_availability(property_id);
CREATE INDEX IF NOT EXISTS idx_property_availability_date ON property_availability(date);
CREATE INDEX IF NOT EXISTS idx_property_availability_available ON property_availability(available);

-- Índices para direct_reservations
CREATE INDEX IF NOT EXISTS idx_direct_reservations_tenant_id ON direct_reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_direct_reservations_property_id ON direct_reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_direct_reservations_dates ON direct_reservations(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_direct_reservations_status ON direct_reservations(reservation_status);
CREATE INDEX IF NOT EXISTS idx_direct_reservations_payment_status ON direct_reservations(payment_status);
CREATE INDEX IF NOT EXISTS idx_direct_reservations_code ON direct_reservations(reservation_code);

-- Índices para commission_transactions
CREATE INDEX IF NOT EXISTS idx_commission_transactions_reservation_id ON commission_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_tenant_id ON commission_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_status ON commission_transactions(status);

-- =====================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para generar código de reserva único
CREATE OR REPLACE FUNCTION generate_reservation_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    code VARCHAR(50);
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generar código: DR + año + mes + 6 dígitos aleatorios
        code := 'DR' || EXTRACT(YEAR FROM NOW()) || LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- Verificar si ya existe
        SELECT COUNT(*) INTO exists_count FROM direct_reservations WHERE reservation_code = code;
        
        IF exists_count = 0 THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular comisiones
CREATE OR REPLACE FUNCTION calculate_commission(
    subtotal_amount DECIMAL(10,2),
    commission_rate DECIMAL(5,4),
    stripe_fee_rate DECIMAL(5,4)
)
RETURNS TABLE(
    delfin_commission DECIMAL(10,2),
    stripe_fee DECIMAL(10,2),
    property_owner_amount DECIMAL(10,2)
) AS $$
DECLARE
    commission DECIMAL(10,2);
    stripe_fee DECIMAL(10,2);
    property_amount DECIMAL(10,2);
BEGIN
    -- Calcular comisión de Delfin (9%)
    commission := subtotal_amount * commission_rate;
    
    -- Calcular comisión de Stripe (1.4% + 0.25€)
    stripe_fee := (subtotal_amount * stripe_fee_rate) + 0.25;
    
    -- Calcular cantidad para propietario
    property_amount := subtotal_amount - commission;
    
    RETURN QUERY SELECT commission, stripe_fee, property_amount;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas
CREATE TRIGGER update_tenant_properties_updated_at BEFORE UPDATE ON tenant_properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_direct_reservations_updated_at BEFORE UPDATE ON direct_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_commission_settings_updated_at BEFORE UPDATE ON tenant_commission_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar configuración de comisiones por defecto para tenants existentes
INSERT INTO tenant_commission_settings (tenant_id, commission_rate, stripe_fee_rate, minimum_commission)
SELECT 
    id as tenant_id,
    0.0900 as commission_rate, -- 9%
    0.0140 as stripe_fee_rate, -- 1.4% + 0.25€
    1.00 as minimum_commission
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM tenant_commission_settings);

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista para estadísticas de reservas por tenant
CREATE OR REPLACE VIEW tenant_reservation_stats AS
SELECT 
    dr.tenant_id,
    COUNT(*) as total_reservations,
    SUM(dr.total_amount) as total_revenue,
    SUM(dr.delfin_commission_amount) as total_commission,
    SUM(dr.property_owner_amount) as total_property_owner_amount,
    AVG(dr.total_amount) as average_reservation_value,
    COUNT(CASE WHEN dr.reservation_status = 'confirmed' THEN 1 END) as confirmed_reservations,
    COUNT(CASE WHEN dr.reservation_status = 'cancelled' THEN 1 END) as cancelled_reservations
FROM direct_reservations dr
GROUP BY dr.tenant_id;

-- Vista para propiedades con estadísticas
CREATE OR REPLACE VIEW property_stats AS
SELECT 
    tp.*,
    COUNT(dr.id) as total_reservations,
    SUM(dr.total_amount) as total_revenue,
    AVG(dr.total_amount) as average_reservation_value,
    COUNT(CASE WHEN dr.reservation_status = 'confirmed' THEN 1 END) as confirmed_reservations
FROM tenant_properties tp
LEFT JOIN direct_reservations dr ON tp.id = dr.property_id
GROUP BY tp.id;

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE tenant_properties IS 'Propiedades de cada tenant para reservas directas';
COMMENT ON TABLE property_availability IS 'Disponibilidad y precios especiales por fecha';
COMMENT ON TABLE direct_reservations IS 'Reservas directas de huéspedes';
COMMENT ON TABLE commission_transactions IS 'Transacciones de comisiones y pagos';
COMMENT ON TABLE tenant_commission_settings IS 'Configuración de comisiones por tenant';

COMMENT ON COLUMN direct_reservations.delfin_commission_rate IS 'Porcentaje de comisión de Delfin (ej: 0.0900 = 9%)';
COMMENT ON COLUMN direct_reservations.stripe_fee_amount IS 'Comisión de Stripe (1.4% + 0.25€)';
COMMENT ON COLUMN direct_reservations.property_owner_amount IS 'Cantidad que recibe el propietario después de comisiones';
