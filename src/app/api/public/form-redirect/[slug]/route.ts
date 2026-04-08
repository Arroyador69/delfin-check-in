import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * URL base del HTML del formulario (sin querystring). Cada tenant sigue usando la misma página;
 * el desambiguado va en la query (tenant_id, api_endpoint, etc.).
 *
 * - NEXT_PUBLIC_TRAVELER_FORM_BASE_URL: forzar URL (p. ej. preview o dominio alternativo).
 * - Producción sin env: https://form.delfincheckin.com (subdominio público).
 * - Localhost: mismo origen /index.html para desarrollo sin CORS extra.
 */
function getTravelerFormBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_TRAVELER_FORM_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local')
  ) {
    return `${req.nextUrl.origin}/index.html`;
  }
  return 'https://form.delfincheckin.com';
}

/**
 * API para redirigir al formulario público con parámetros del tenant
 * URL: /api/public/form-redirect/[slug]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug requerido' },
        { status: 400 }
      );
    }

    // Buscar tenant por slug (usar ID del tenant como slug)
    const result = await sql`
      SELECT 
        t.id,
        t.name,
        t.email,
        t.status,
        t.config
      FROM tenants t
      WHERE t.id = ${slug}
        AND t.status = 'active'
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Formulario no encontrado o inactivo' },
        { status: 404 }
      );
    }

    const tenant = result.rows[0];

    const apiOrigin = (
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      req.nextUrl.origin
    ).replace(/\/$/, '');

    const formBase = getTravelerFormBaseUrl(req);

    // Parámetros del tenant para personalizar el formulario
    const tenantParams = new URLSearchParams({
      tenant_id: tenant.id,
      tenant_name: tenant.config?.propertyName || tenant.name,
      tenant_email: tenant.email,
      tenant_phone: tenant.config?.contactPhone || '',
      tenant_address: tenant.config?.address || '',
      tenant_city: tenant.config?.city || '',
      tenant_country: tenant.config?.country || '',
      api_endpoint: `${apiOrigin}/api/public/form/${tenant.id}/submit`
    });

    const sep = formBase.includes('?') ? '&' : '?';
    const redirectUrl = `${formBase}${sep}${tenantParams.toString()}`;
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error redirigiendo al formulario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
