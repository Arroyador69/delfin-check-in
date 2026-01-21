import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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
    const validLocales = ['es', 'en', 'it', 'pt', 'fr'];
    if (!locale || !validLocales.includes(locale)) {
      return NextResponse.json(
        { error: 'Locale inválido. Debe ser uno de: es, en, it, pt, fr' },
        { status: 400 }
      );
    }

    // Guardar preferencia en BD
    // Nota: Usamos JSONB para almacenar preferencias de manera flexible
    const query = `
      UPDATE tenants 
      SET preferences = COALESCE(preferences, '{}'::jsonb) || jsonb_build_object('locale', $1::text)
      WHERE id = $2
      RETURNING id, preferences
    `;

    const result = await pool.query(query, [locale, tenantId]);

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

    // Obtener preferencias de BD
    const query = `
      SELECT preferences 
      FROM tenants 
      WHERE id = $1
    `;

    const result = await pool.query(query, [tenantId]);

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
