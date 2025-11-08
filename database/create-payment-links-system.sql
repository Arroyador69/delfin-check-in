-- =====================================================
-- SISTEMA DE ENLACES DE PAGO
-- =====================================================
-- Este archivo define las tablas necesarias para crear
-- enlaces de pago personalizados desde la configuración

-- Tabla de enlaces de pago
CREATE TABLE IF NOT EXISTS payment_links (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  
  -- Código único del enlace (usado en la URL)
  link_code VARCHAR(50) UNIQUE NOT NULL,
  
  -- Tipo de recurso: 'room' (slot de habitación) o 'property' (propiedad)
  resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('room', 'property')),
  
  -- ID del recurso (room_id UUID como texto o property_id INTEGER)
  resource_id VARCHAR(255) NOT NULL,
  
  -- Nombre descriptivo del enlace (opcional, para referencia interna)
  link_name VARCHAR(255),
  
  -- Fechas de la reserva
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  
  -- Precio total configurado
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Precio base por noche (para cálculos)
  base_price_per_night DECIMAL(10,2),
  
  -- Tarifa de limpieza (opcional)
  cleaning_fee DECIMAL(10,2) DEFAULT 0.00,
  
  -- Número de huéspedes esperados
  expected_guests INTEGER DEFAULT 2,
  
  -- Fecha de expiración del enlace
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Estado del enlace
  is_active BOOLEAN DEFAULT true,
  
  -- Contador de usos (cuántas veces se ha usado)
  usage_count INTEGER DEFAULT 0,
  
  -- Límite de usos (por defecto 1 = un solo uso)
  max_uses INTEGER DEFAULT 1,
  
  -- Estado del pago
  payment_completed BOOLEAN DEFAULT false,
  payment_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- ID de la reserva creada (si el pago fue exitoso)
  reservation_id INTEGER,
  
  -- Notas internas
  internal_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para optimización
  CONSTRAINT fk_payment_links_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_payment_links_tenant_id ON payment_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_link_code ON payment_links(link_code);
CREATE INDEX IF NOT EXISTS idx_payment_links_active ON payment_links(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_links_expires_at ON payment_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_links_resource ON payment_links(resource_type, resource_id);

-- Función para generar código único de enlace
CREATE OR REPLACE FUNCTION generate_payment_link_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    code VARCHAR(50);
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generar código: PL + año + mes + 6 dígitos aleatorios
        code := 'PL' || EXTRACT(YEAR FROM NOW()) || LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- Verificar si ya existe
        SELECT COUNT(*) INTO exists_count FROM payment_links WHERE link_code = code;
        
        IF exists_count = 0 THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_payment_links_updated_at 
BEFORE UPDATE ON payment_links 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Comentarios de documentación
COMMENT ON TABLE payment_links IS 'Enlaces de pago personalizados creados desde configuración';
COMMENT ON COLUMN payment_links.resource_type IS 'Tipo de recurso: room (slot de habitación) o property (propiedad multitenant)';
COMMENT ON COLUMN payment_links.resource_id IS 'ID del recurso (UUID para rooms, INTEGER para properties)';
COMMENT ON COLUMN payment_links.link_code IS 'Código único usado en la URL del enlace';
COMMENT ON COLUMN payment_links.total_price IS 'Precio total configurado para este enlace';
COMMENT ON COLUMN payment_links.expires_at IS 'Fecha de expiración del enlace (NULL = sin expiración)';
COMMENT ON COLUMN payment_links.max_uses IS 'Límite de usos del enlace (por defecto 1 = un solo uso)';
COMMENT ON COLUMN payment_links.payment_completed IS 'Indica si el pago ha sido completado exitosamente';
COMMENT ON COLUMN payment_links.reservation_id IS 'ID de la reserva creada en direct_reservations cuando el pago es exitoso';

