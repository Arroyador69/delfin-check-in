import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { locales } from '@/i18n/config';

/**
 * 🌍 API: GUARDAR PREFERENCIAS DE USUARIO (IDIOMA)
 * 
 * POST /api/user/preferences
 * 
 * Guarda la preferencia de idioma del usuario en la base de datos.
 * Se guarda en la tabla de tenants para que persista entre sesiones.
 */

export async function POST(req: NextRequest) {
  try {
    // Obtener token de autenticación
    const authToken = req.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'No autorizado - token requerido' },
        { status: 401 }
      );
    }

    // Verificar token y obtener tenant_id
    const payload = verifyToken(authToken);
    
    if (!payload || !payload.tenantId) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const tenantId = payload.tenantId;

    // Obtener locale del body
    const body = await req.json();
    const { locale } = body;

    // Validar locale
    const validLocales = [...locales];
    if (!locale || !validLocales.includes(locale)) {
      return NextResponse.json(
        { error: `Locale inválido. Debe ser uno de: ${validLocales.join(', ')}` },
        { status: 400 }
      );
    }

    // Guardar preferencia en BD usando Vercel Postgres
    const result = await sql`
      UPDATE tenants 
      SET preferences = COALESCE(preferences, '{}'::jsonb) || jsonb_build_object('locale', ${locale}::text)
      WHERE id = ${tenantId}
      RETURNING id, preferences
    `;

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    console.log(`✅ Preferencia de idioma guardada: ${locale} para tenant ${tenantId}`);

    return NextResponse.json({
      success: true,
      locale,
      preferences: result.rows[0].preferences
    });

  } catch (error: any) {
    console.error('❌ Error guardando preferencia de idioma:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/preferences
 * 
 * Obtiene las preferencias del usuario (incluyendo idioma).
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener token de autenticación
    const authToken = req.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'No autorizado - token requerido' },
        { status: 401 }
      );
    }

    // Verificar token y obtener tenant_id
    const payload = verifyToken(authToken);
    
    if (!payload || !payload.tenantId) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const tenantId = payload.tenantId;

    // Obtener preferencias de BD usando Vercel Postgres
    const result = await sql`
      SELECT preferences 
      FROM tenants 
      WHERE id = ${tenantId}
    `;

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const preferences = result.rows[0].preferences || {};

    return NextResponse.json({
      success: true,
      preferences,
      locale: preferences.locale || 'es' // Default a español
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo preferencias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
