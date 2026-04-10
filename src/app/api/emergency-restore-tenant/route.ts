import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function unauthorizedEmergency() {
  return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
}

/** Solo usable con EMERGENCY_RESTORE_SECRET en el entorno y cabecera x-emergency-restore-secret. */
function assertEmergencyAuthorized(req: NextRequest): NextResponse | null {
  const expected = process.env.EMERGENCY_RESTORE_SECRET?.trim();
  if (!expected) return unauthorizedEmergency();
  const got = req.headers.get('x-emergency-restore-secret')?.trim();
  if (!got || got !== expected) return unauthorizedEmergency();
  return null;
}

/**
 * 🚨 ENDPOINT DE EMERGENCIA PARA RESTAURAR TENANT
 *
 * Protegido por EMERGENCY_RESTORE_SECRET + cabecera x-emergency-restore-secret.
 * Sin secreto configurado, responde 404 (no exponer que la ruta existe).
 */
export async function POST(req: NextRequest) {
  const deny = assertEmergencyAuthorized(req);
  if (deny) return deny;

  try {
    console.log('🚨 Iniciando restauración de emergencia del tenant...');

    // 1. Crear tabla tenants si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        plan_id VARCHAR(50) NOT NULL CHECK (plan_id IN ('basic', 'standard', 'premium', 'enterprise')),
        max_rooms INTEGER NOT NULL DEFAULT 2,
        current_rooms INTEGER NOT NULL DEFAULT 0 CHECK (current_rooms >= 0),
        stripe_customer_id VARCHAR(255) UNIQUE,
        stripe_subscription_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
        trial_ends_at TIMESTAMP WITH TIME ZONE,
        config JSONB DEFAULT '{"propertyName": "", "timezone": "Europe/Madrid", "language": "es", "currency": "EUR"}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT valid_rooms_count CHECK (current_rooms <= max_rooms OR max_rooms = -1)
      );
    `;

    // 2. Crear tabla tenant_users si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, email)
      );
    `;

    // 3. Crear tabla Room si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS "Room" (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "lodgingId" UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 4. Restaurar tu tenant con configuración completa
    await sql`
      INSERT INTO tenants (
        id, 
        name, 
        email, 
        plan_id, 
        max_rooms, 
        current_rooms, 
        status,
        config
      ) VALUES (
        '870e589f-d313-4a5a-901f-f25fd4e7240a',
        'Delfín Check-in',
        'contacto@delfincheckin.com',
        'premium',
        6,
        6,
        'active',
        ${
          JSON.stringify({
            propertyName: "Delfín Check-in",
            timezone: "Europe/Madrid",
            language: "es",
            currency: "EUR",
            mir: {
              enabled: true,
              codigoEstablecimiento: "",
              denominacion: "Delfín Check-in",
              direccionCompleta: "",
              autoSubmit: false,
              testMode: true
            },
            telegram: {
              enabled: true,
              botToken: "YOUR_TELEGRAM_BOT_TOKEN", // Reemplaza con tu token real
              chatId: "YOUR_CHAT_ID", // Reemplaza con tu chat ID real
              aiEnabled: true,
              autoResponses: true
            }
          })
        }::jsonb
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        plan_id = EXCLUDED.plan_id,
        max_rooms = EXCLUDED.max_rooms,
        current_rooms = EXCLUDED.current_rooms,
        status = EXCLUDED.status,
        config = EXCLUDED.config,
        updated_at = NOW();
    `;

    // 5. Crear habitaciones por defecto
    const rooms = [
      { id: '1', name: 'Habitación 1' },
      { id: '2', name: 'Habitación 2' },
      { id: '3', name: 'Habitación 3' },
      { id: '4', name: 'Habitación 4' },
      { id: '5', name: 'Habitación 5' },
      { id: '6', name: 'Habitación 6' }
    ];

    for (const room of rooms) {
      await sql`
        INSERT INTO "Room" (id, name, "lodgingId")
        VALUES (${room.id}, ${room.name}, '870e589f-d313-4a5a-901f-f25fd4e7240a')
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          "lodgingId" = EXCLUDED."lodgingId",
          updated_at = NOW();
      `;
    }

    // 6. Crear usuario administrador por defecto
    await sql`
      INSERT INTO tenant_users (
        tenant_id,
        email,
        password_hash,
        full_name,
        role,
        is_active,
        email_verified
      ) VALUES (
        '870e589f-d313-4a5a-901f-f25fd4e7240a',
        'admin@delfincheckin.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', -- hash bcrypt (rotar contraseña tras uso)
        'Administrador',
        'owner',
        true,
        true
      ) ON CONFLICT (tenant_id, email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        email_verified = EXCLUDED.email_verified,
        updated_at = NOW();
    `;

    console.log('✅ Restauración de emergencia completada');

    return NextResponse.json({
      success: true,
      message: 'Tenant restaurado exitosamente',
      tenant: {
        id: '870e589f-d313-4a5a-901f-f25fd4e7240a',
        name: 'Delfín Check-in',
        email: 'contacto@delfincheckin.com',
        plan: 'premium',
        rooms: 6,
        status: 'active'
      },
      tables_created: ['tenants', 'tenant_users', 'Room'],
      rooms_created: 6,
      admin_user: {
        email: 'admin@delfincheckin.com',
        note: 'Si creaste el usuario con contraseña temporal, cámbiala tras el primer acceso.',
      },
    });

  } catch (error) {
    console.error('❌ Error en restauración de emergencia:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error restaurando tenant',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const deny = assertEmergencyAuthorized(req);
  if (deny) return deny;

  try {
    // Verificar estado de las tablas
    const tables = ['tenants', 'tenant_users', 'Room'];
    const status = {};

    for (const table of tables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
        status[table] = { exists: true, count: result.rows[0]?.count || 0 };
      } catch (error) {
        status[table] = { exists: false, error: error instanceof Error ? error.message : 'Error desconocido' };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Estado de las tablas',
      tables: status,
      tenant_id: '870e589f-d313-4a5a-901f-f25fd4e7240a'
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error verificando estado',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
