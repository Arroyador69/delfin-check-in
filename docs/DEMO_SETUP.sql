-- =============================================================================
-- Datos de demostración — Delfín Check-in (Neon / PostgreSQL)
-- =============================================================================
-- Requisitos previos:
--   • Migraciones aplicadas: tenants con country_code, guided_onboarding_step,
--     contact_phone; tabla tenant_users; ver database/migration-guided-onboarding-country.sql
--   • Tabla opcional: onboarding_analytics_events (database/migration-onboarding-analytics.sql)
--
-- Contraseña para ambos usuarios demo: Demo123!
-- Hash bcrypt (12 rounds), generado con bcryptjs en el repo:
--   node -e "console.log(require('bcryptjs').hashSync('Demo123!',12))"
--
-- Login en /admin-login con el email del tenant_usuario (no uses el email del tenant
-- si difiere; aquí coinciden).
--
-- Idempotencia: si los emails ya existen en tenants, ajusta los INSERT o borra antes.
--
-- IMPORTANTE — plan_type (Neon):
--   La tabla tenants suele tener CHECK tenants_plan_type_check con valores
--   ('free', 'checkin', 'pro'). Hay que rellenar plan_type explícitamente; solo
--   plan_id = 'standard' sin plan_type puede violar el constraint.
--   Aquí usamos plan_id 'premium' + plan_type 'checkin' (límite holgado para demo).
--
-- Si el editor muestra "ROLLBACK required": ejecuta antes  ROLLBACK;
-- =============================================================================

-- Contraseña: Demo123!
-- Si cambias la contraseña, regenera el hash y sustituye password_hash.

BEGIN;

-- Demo 1: España (MIR / flujo ES)
INSERT INTO tenants (
  id,
  name,
  email,
  plan_id,
  plan_type,
  max_rooms,
  current_rooms,
  status,
  country_code,
  guided_onboarding_step,
  contact_phone
)
SELECT
  gen_random_uuid(),
  'Casa Málaga Centro',
  'demo1@delfincheckin.com',
  'premium',
  'checkin',
  10,
  0,
  'active',
  'ES',
  'complete',
  '+34 666 123 456'
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE email = 'demo1@delfincheckin.com');

INSERT INTO tenant_users (
  tenant_id,
  email,
  password_hash,
  full_name,
  role,
  is_active,
  email_verified
)
SELECT
  t.id,
  'demo1@delfincheckin.com',
  '$2a$12$fNOfEODmQVPG2Jhap/h.BOOoimBSEzYastvIVfI2NBddVQjCGV6w.',
  'Demo Málaga',
  'owner',
  true,
  true
FROM tenants t
WHERE t.email = 'demo1@delfincheckin.com'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.tenant_id = t.id AND tu.email = 'demo1@delfincheckin.com'
  );

-- Demo 2: país FR en tenant (probar UI sin MIR específico España)
INSERT INTO tenants (
  id,
  name,
  email,
  plan_id,
  plan_type,
  max_rooms,
  current_rooms,
  status,
  country_code,
  guided_onboarding_step,
  contact_phone
)
SELECT
  gen_random_uuid(),
  'Villa Barcelona (demo FR)',
  'demo2@delfincheckin.com',
  'premium',
  'checkin',
  10,
  0,
  'active',
  'FR',
  'complete',
  '+33 1 23 45 67 89'
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE email = 'demo2@delfincheckin.com');

INSERT INTO tenant_users (
  tenant_id,
  email,
  password_hash,
  full_name,
  role,
  is_active,
  email_verified
)
SELECT
  t.id,
  'demo2@delfincheckin.com',
  '$2a$12$fNOfEODmQVPG2Jhap/h.BOOoimBSEzYastvIVfI2NBddVQjCGV6w.',
  'Demo Francia',
  'owner',
  true,
  true
FROM tenants t
WHERE t.email = 'demo2@delfincheckin.com'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.tenant_id = t.id AND tu.email = 'demo2@delfincheckin.com'
  );

COMMIT;

-- -----------------------------------------------------------------------------
-- Propiedades / habitaciones / reservas
-- -----------------------------------------------------------------------------
-- El calendario usa tablas Prisma-style "Lodging" y "Room" creadas en runtime
-- por el onboarding o por el propio código. Para una demo con habitaciones ya
-- visibles, ejecuta el onboarding una vez con cada cuenta o crea Lodging/Room
-- manualmente alineando lodgingId con el UUID del tenant (ver
-- src/lib/guided-onboarding-rooms.ts).
--
-- Reservas: opcional; dependen de tu esquema de reservations + tenant_id.
