import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

const ALLOWED_LANG = new Set(['es', 'en', 'fr', 'it', 'pt', 'fi']);

/**
 * País del negocio (ISO2) + idioma de cuenta (config.language) para todos los planes.
 * No depende del módulo legal (a diferencia de PUT /api/tenant/country-code).
 */
export async function PUT(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || (await getTenantId(req));
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No se pudo identificar el tenant' }, { status: 401 });
    }

    const body = await req.json();
    const country_code = body?.country_code != null ? String(body.country_code).trim() : '';
    const language = body?.language != null ? String(body.language).trim().toLowerCase() : '';

    if (!country_code || !/^[A-Z]{2}$/i.test(country_code)) {
      return NextResponse.json(
        { success: false, error: 'Código de país obligatorio (ISO 3166-1 alpha-2, ej. ES).' },
        { status: 400 }
      );
    }
    if (!language || !ALLOWED_LANG.has(language)) {
      return NextResponse.json(
        { success: false, error: 'Idioma obligatorio: es, en, fr, it, pt o fi.' },
        { status: 400 }
      );
    }

    const cc = country_code.toUpperCase();

    // Neon/Postgres puede no inferir el tipo de parámetros dentro de jsonb_build_object;
    // forzamos casts explícitos para evitar 42P18.
    const text = `
      UPDATE tenants
      SET
        country_code = $1::text,
        config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('language', $2::text),
        updated_at = NOW()
      WHERE id = $3::uuid
    `;
    const params = [cc, language, tenantId];
    await (sql as any).query(text, params);

    return NextResponse.json({ success: true, country_code: cc, language });
  } catch (e) {
    console.error('[tenant/business-locale] PUT', e);
    return NextResponse.json({ success: false, error: 'Error al guardar' }, { status: 500 });
  }
}
