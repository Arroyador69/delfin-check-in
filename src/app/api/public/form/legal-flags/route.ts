import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantById, hasLegalModuleAccess, type Tenant } from '@/lib/tenant';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-UI-Locale',
};

/**
 * Indica si el formulario público debe mostrar textos legales de España / MIR.
 * Solo aplica cuando el establecimiento es ES y el tenant tiene módulo legal para ES.
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

function resolveEstablishmentCountry(
  tenant: Tenant,
  propertyCountry: string | null | undefined,
  tenantFallbackCountry: string | null | undefined
): string {
  const p = (propertyCountry || '').trim().toUpperCase();
  if (p.length === 2) return p;
  const t = (tenant.country_code || tenantFallbackCountry || '').trim().toUpperCase();
  if (t.length === 2) return t;
  return 'ES';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');
    const propertyId = searchParams.get('property_id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id requerido', showSpainMirLegalCopy: true },
        { status: 400, headers: corsHeaders }
      );
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant no encontrado', showSpainMirLegalCopy: false },
        { status: 404, headers: corsHeaders }
      );
    }

    let propertyCountry: string | null = null;
    if (propertyId && /^\d+$/.test(propertyId)) {
      const pr = await sql`
        SELECT country_code FROM tenant_properties
        WHERE id = ${parseInt(propertyId, 10)} AND tenant_id = ${tenantId}::uuid
        LIMIT 1
      `;
      propertyCountry = pr.rows[0]?.country_code ?? null;
    }

    if (!propertyCountry) {
      const pr2 = await sql`
        SELECT country_code FROM tenant_properties
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY id ASC
        LIMIT 1
      `;
      propertyCountry = pr2.rows[0]?.country_code ?? null;
    }

    const establishmentCountry = resolveEstablishmentCountry(
      tenant as Tenant,
      propertyCountry,
      (tenant as { country_code?: string | null }).country_code
    );

    const showSpainMirLegalCopy =
      establishmentCountry === 'ES' &&
      !!tenant.legal_module &&
      hasLegalModuleAccess(tenant as Tenant, 'ES');

    return NextResponse.json(
      {
        showSpainMirLegalCopy,
        establishmentCountry,
      },
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error('legal-flags:', e);
    return NextResponse.json(
      { showSpainMirLegalCopy: true, establishmentCountry: 'ES', error: 'fallback' },
      { status: 200, headers: corsHeaders }
    );
  }
}
