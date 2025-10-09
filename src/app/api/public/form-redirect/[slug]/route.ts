import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * API para redirigir al formulario público existente con parámetros del tenant
 * URL: /api/public/form-redirect/[slug]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

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

    // URL del formulario existente en GitHub Pages
    const formUrl = 'https://form.delfincheckin.com';
    
    // Parámetros del tenant para personalizar el formulario
    const tenantParams = new URLSearchParams({
      tenant_id: tenant.id,
      tenant_name: tenant.config?.propertyName || tenant.name,
      tenant_email: tenant.email,
      tenant_phone: tenant.config?.contactPhone || '',
      tenant_address: tenant.config?.address || '',
      tenant_city: tenant.config?.city || '',
      tenant_country: tenant.config?.country || '',
      api_endpoint: `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com'}/api/public/form/${tenant.id}/submit`
    });

    // Redirigir al formulario con parámetros
    const redirectUrl = `${formUrl}?${tenantParams.toString()}`;
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error redirigiendo al formulario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
