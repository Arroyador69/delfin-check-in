import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  let tenantId = await getTenantId(req);
  if (!tenantId || tenantId.trim() === '') {
    tenantId = req.headers.get('x-tenant-id');
  }
  if (!tenantId || tenantId === 'default' || tenantId.trim() === '') return null;
  return tenantId;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    const result = await sql`
      SELECT config FROM tenants WHERE id = ${tenantId}::uuid
    `;
    if (result.rows.length === 0) {
      return NextResponse.json({ success: true, zone: null });
    }
    const config = result.rows[0].config || {};
    const zone = config.market_zone || null;
    return NextResponse.json({ success: true, zone });
  } catch (error) {
    console.error('[market/zone] GET error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    const body = await req.json();
    const { address, lat, lon, city, province, community } = body;

    const result = await sql`
      SELECT config FROM tenants WHERE id = ${tenantId}::uuid
    `;
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tenant no encontrado' }, { status: 404 });
    }

    const config = result.rows[0].config || {};
    const updatedConfig = {
      ...config,
      market_zone: {
        address: address || '',
        lat: lat != null ? lat : null,
        lon: lon != null ? lon : null,
        city: city || '',
        province: province || '',
        community: community || '',
      },
    };

    await sql`
      UPDATE tenants SET config = ${JSON.stringify(updatedConfig)}::jsonb, updated_at = NOW()
      WHERE id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true, zone: updatedConfig.market_zone });
  } catch (error) {
    console.error('[market/zone] PUT error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
