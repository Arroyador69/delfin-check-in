-- ========================================
-- ESQUEMA MULTI-TENANT PARA DELFÍN CHECK-IN
-- ========================================
-- Este archivo define las tablas necesarias para convertir
-- el sistema en un SaaS multi-tenant donde cada cliente
-- tiene su propia "instancia" con datos aislados

-- ========================================
-- TABLA: tenants (Clientes/Propietarios)
-- ========================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Información básica
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  
  -- Plan y límites
  plan_id VARCHAR(50) NOT NULL CHECK (plan_id IN ('basic', 'standard', 'premium', 'enterprise')),
  max_rooms INTEGER NOT NULL DEFAULT 2,
  current_rooms INTEGER NOT NULL DEFAULT 0 CHECK (current_rooms >= 0),
  
  -- Integración con Stripe
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255),
  
  -- Estado de la cuenta
  status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Configuración específica del tenant (JSON)
  config JSONB DEFAULT '{
    "propertyName": "",
    "timezone": "Europe/Madrid",
    "language": "es",
    "currency": "EUR",
    "mir": {
      "enabled": true,
      "codigoEstablecimiento": "",
      "denominacion": "",
      "direccionCompleta": "",
      "autoSubmit": false,
      "testMode": true
    }
  }'::jsonb,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para rendimiento
  CONSTRAINT valid_rooms_count CHECK (current_rooms <= max_rooms OR max_rooms = -1)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE tenants IS 'Almacena información de cada cliente/propietario del SaaS';
COMMENT ON COLUMN tenants.plan_id IS 'Plan de suscripción: basic, standard, premium, enterprise';
COMMENT ON COLUMN tenants.max_rooms IS 'Número máximo de habitaciones según plan (-1 = ilimitado)';
COMMENT ON COLUMN tenants.current_rooms IS 'Número actual de habitaciones configuradas';
COMMENT ON COLUMN tenants.status IS 'Estado de la cuenta: active, trial, suspended, cancelled';
COMMENT ON COLUMN tenants.config IS 'Configuración personalizada del tenant en formato JSON';

-- ========================================
-- TABLA: tenant_users (Usuarios por tenant)
-- ========================================
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relación con tenant
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Credenciales
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt hash de la contraseña
  
  -- Información adicional
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff')),
  
  -- Control de sesión
  last_login TIMESTAMP WITH TIME ZONE,
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  
  -- Estado
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: Un email único por tenant
  UNIQUE(tenant_id, email)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(email);
CREATE INDEX IF NOT EXISTS idx_tenant_users_reset_token ON tenant_users(reset_token);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_tenant_users_updated_at BEFORE UPDATE ON tenant_users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE tenant_users IS 'Usuarios con acceso a cada tenant (cliente)';
COMMENT ON COLUMN tenant_users.password_hash IS 'Hash bcrypt de la contraseña del usuario';
COMMENT ON COLUMN tenant_users.role IS 'Rol del usuario: owner (propietario), admin (administrador), staff (empleado)';
COMMENT ON COLUMN tenant_users.reset_token IS 'Token para recuperación de contraseña';
COMMENT ON COLUMN tenant_users.email_verified IS 'Si el email ha sido verificado';

-- ========================================
-- MIGRACIÓN: Añadir tenant_id a tablas existentes
-- ========================================
-- IMPORTANTE: Estas migraciones deben ejecutarse después de crear las tablas tenants y tenant_users
-- y después de migrar los datos existentes a un tenant por defecto

-- Añadir tenant_id a tabla rooms
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rooms_tenant_id ON rooms(tenant_id);

COMMENT ON COLUMN rooms.tenant_id IS 'ID del tenant (cliente) al que pertenece esta habitación';

-- Añadir tenant_id a tabla reservations
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reservations_tenant_id ON reservations(tenant_id);

COMMENT ON COLUMN reservations.tenant_id IS 'ID del tenant (cliente) al que pertenece esta reserva';

-- Añadir tenant_id a tabla guests
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_guests_tenant_id ON guests(tenant_id);

COMMENT ON COLUMN guests.tenant_id IS 'ID del tenant (cliente) al que pertenece este huésped';

-- Añadir tenant_id a tabla guest_registrations
ALTER TABLE guest_registrations 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_guest_registrations_tenant_id ON guest_registrations(tenant_id);

COMMENT ON COLUMN guest_registrations.tenant_id IS 'ID del tenant (cliente) al que pertenece este registro';

-- Añadir tenant_id a tabla messages (si existe)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages(tenant_id);

COMMENT ON COLUMN messages.tenant_id IS 'ID del tenant (cliente) al que pertenece este mensaje';

-- ========================================
-- DOCUMENTACIÓN: Relaciones entre tablas
-- ========================================

/*
ESTRUCTURA MULTI-TENANT:

┌─────────────────┐
│    TENANTS      │ (Clientes/Propietarios)
│  - id (PK)      │
│  - email        │
│  - plan_id      │
│  - max_rooms    │
│  - stripe_*     │
└────────┬────────┘
         │
         ├───────────────────────────────────────┐
         │                                       │
         ▼                                       ▼
┌─────────────────┐                    ┌──────────────────┐
│  TENANT_USERS   │                    │     ROOMS        │
│  - id (PK)      │                    │  - id (PK)       │
│  - tenant_id(FK)│                    │  - tenant_id(FK) │
│  - email        │                    │  - name          │
│  - password_hash│                    │  - ical_urls     │
│  - role         │                    └────────┬─────────┘
└─────────────────┘                             │
                                                │
                                                ▼
                                       ┌──────────────────┐
                                       │  RESERVATIONS    │
                                       │  - id (PK)       │
                                       │  - tenant_id(FK) │
                                       │  - room_id (FK)  │
                                       │  - guest_name    │
                                       └────────┬─────────┘
                                                │
                                                ▼
                                       ┌──────────────────┐
                                       │     GUESTS       │
                                       │  - id (PK)       │
                                       │  - tenant_id(FK) │
                                       │  - reservation_id│
                                       │  - document_num  │
                                       └──────────────────┘

┌─────────────────────────────────────────────────────┐
│  GUEST_REGISTRATIONS (Registros MIR)                │
│  - id (PK)                                          │
│  - tenant_id (FK)  ← IMPORTANTE para MIR por tenant│
│  - reserva_ref                                      │
│  - data (JSONB)                                     │
└─────────────────────────────────────────────────────┘

REGLAS DE AISLAMIENTO:
======================

1. QUERIES: Todas las consultas DEBEN filtrar por tenant_id
   Ejemplo: SELECT * FROM "Room" WHERE "lodgingId" = $current_tenant_id

2. INSERTS: Todos los inserts DEBEN incluir tenant_id
   Ejemplo: INSERT INTO "Room" (name, "lodgingId") VALUES ($name, $tenant_id)

3. MIDDLEWARE: Verificar tenant_id en cada request
   - Extraer tenant_id del JWT token
   - Validar que el tenant existe y está activo
   - Pasar tenant_id a todas las queries

4. SEGURIDAD: Row Level Security (RLS) en Supabase
   - Políticas para que usuarios solo vean datos de su tenant
   - Prevenir acceso cruzado entre tenants

FLUJO DE AUTENTICACIÓN MULTI-TENANT:
====================================

1. Usuario hace login → verifica credenciales en tenant_users
2. Sistema genera JWT con { userId, tenantId }
3. Middleware extrae tenantId del JWT
4. Todas las queries usan WHERE tenant_id = $tenantId
5. Usuario solo ve datos de su tenant

MIGRACIÓN DE DATOS EXISTENTES:
==============================

Cuando se implemente, crear un tenant "default" para los datos actuales:

INSERT INTO tenants (id, name, email, plan_id, max_rooms, status)
VALUES (
  gen_random_uuid(),
  'Cliente Actual',
  'actual@delfincheckin.com',
  'premium',
  6,
  'active'
);

Luego actualizar todas las tablas existentes con ese tenant_id.
*/
