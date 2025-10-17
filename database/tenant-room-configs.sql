-- Tabla para configuración de habitaciones por tenant
CREATE TABLE IF NOT EXISTS tenant_room_configs (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    room_name VARCHAR(255) NOT NULL,
    room_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Índices
    UNIQUE(tenant_id, room_order),
    INDEX idx_tenant_room_configs_tenant_id (tenant_id),
    INDEX idx_tenant_room_configs_order (tenant_id, room_order)
);

-- Actualizar tabla tenants para incluir límites del plan
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS plan_limits JSONB DEFAULT '{"max_rooms": 6, "max_reservations": 100, "max_guests": 50}';

-- Insertar configuración por defecto para tenant existente (tu caso)
INSERT INTO tenant_room_configs (tenant_id, room_name, room_order)
VALUES 
    ('870e589f-d313-4a5a-901f-f25fd4e7240a', 'Habitación 1', 1),
    ('870e589f-d313-4a5a-901f-f25fd4e7240a', 'Habitación 2', 2),
    ('870e589f-d313-4a5a-901f-f25fd4e7240a', 'Habitación 3', 3),
    ('870e589f-d313-4a5a-901f-f25fd4e7240a', 'Habitación 4', 4),
    ('870e589f-d313-4a5a-901f-f25fd4e7240a', 'Habitación 5', 5),
    ('870e589f-d313-4a5a-901f-f25fd4e7240a', 'Habitación 6', 6)
ON CONFLICT (tenant_id, room_order) DO NOTHING;

-- Actualizar límites del tenant existente
UPDATE tenants 
SET plan_limits = '{"max_rooms": 6, "max_reservations": 100, "max_guests": 50}'
WHERE id = '870e589f-d313-4a5a-901f-f25fd4e7240a';
