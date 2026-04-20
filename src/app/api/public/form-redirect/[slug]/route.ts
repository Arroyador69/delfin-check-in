import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantById } from '@/lib/tenant';
import { hasCheckinInstructionsEmailPlan } from '@/lib/checkin-email-plan';

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

    // Validación de plan/estado para que el propietario no tenga que "arreglar" enlaces.
    // Si el tenant está suspendido/cancelado (o la suscripción está impagada/cancelada),
    // no redirigimos al formulario: devolvemos un HTML claro.
    let fullTenant = null as Awaited<ReturnType<typeof getTenantById>> | null;
    try {
      fullTenant = await getTenantById(String(tenant.id));
    } catch {
      fullTenant = null;
    }
    const tenantStatus = (fullTenant?.status || tenant.status) as
      | 'active'
      | 'trial'
      | 'suspended'
      | 'cancelled';
    const subStatus = (fullTenant as any)?.subscription_status as
      | 'active'
      | 'trialing'
      | 'past_due'
      | 'canceled'
      | 'unpaid'
      | undefined;

    const serviceAllowed =
      (tenantStatus === 'active' || tenantStatus === 'trial') &&
      subStatus !== 'canceled' &&
      subStatus !== 'unpaid';

    if (!serviceAllowed) {
      const locale =
        (tenant.config?.language && String(tenant.config.language).trim()) ||
        (req.headers.get('accept-language')?.split(',')[0]?.trim() || 'es');
      const html = `<!doctype html>
<html lang="${String(locale).slice(0, 2) || 'es'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Delfín Check-in</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;margin:0;background:#f8fafc;color:#0f172a}
    .wrap{max-width:720px;margin:0 auto;padding:32px}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px}
    h1{font-size:18px;margin:0 0 10px}
    p{margin:8px 0;line-height:1.5;color:#334155}
    .muted{color:#64748b;font-size:12px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Este enlace no está disponible</h1>
      <p>El alojamiento no tiene el servicio activo en este momento. Contacta con el propietario para que revise su plan o el estado de la suscripción.</p>
      <p class="muted">Código: TENANT_INACTIVE · Tenant: ${String(tenant.id)}</p>
    </div>
  </div>
</body>
</html>`;
      return new NextResponse(html, {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    let propertyId = '';
    try {
      const propRow = await sql`
        SELECT id::text AS id FROM tenant_properties
        WHERE tenant_id = ${tenant.id}::uuid
        ORDER BY id ASC
        LIMIT 1
      `;
      propertyId = propRow.rows[0]?.id || '';
    } catch {
      propertyId = '';
    }

    const apiOrigin = (
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      req.nextUrl.origin
    ).replace(/\/$/, '');

    const formBase = getTravelerFormBaseUrl(req);

    // Locale del formulario: el del tenant (enlace creado desde admin), con fallback a ES.
    const locale =
      (tenant.config?.language && String(tenant.config.language).trim()) ||
      (req.headers.get('accept-language')?.split(',')[0]?.trim() || 'es');

    // Feature flags por plan: SOLO Standard/Pro pueden usar envío de instrucciones por email.
    let canEmailCheckinInstructions = false;
    try {
      canEmailCheckinInstructions = !!(
        fullTenant && hasCheckinInstructionsEmailPlan(fullTenant)
      );
    } catch {
      canEmailCheckinInstructions = false;
    }

    // Parámetros del tenant para personalizar el formulario
    const tenantParams = new URLSearchParams({
      tenant_id: tenant.id,
      tenant_name: tenant.config?.propertyName || tenant.name,
      tenant_email: tenant.email,
      tenant_phone: tenant.config?.contactPhone || '',
      tenant_address: tenant.config?.address || '',
      tenant_city: tenant.config?.city || '',
      tenant_country: tenant.config?.country || '',
      api_endpoint: `${apiOrigin}/api/public/form/${tenant.id}/submit`,

      // Preferencias/flags para el formulario por-tenant
      ui_locale: locale,
      checkin_email_enabled: canEmailCheckinInstructions ? '1' : '0',
      property_id: propertyId,
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
