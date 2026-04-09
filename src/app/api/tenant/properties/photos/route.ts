import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

function isDataUrl(s: string): boolean {
  return typeof s === 'string' && s.startsWith('data:image/');
}

export async function POST(req: NextRequest) {
  try {
    let tenantId = req.headers.get('x-tenant-id');
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      tenantId = await getTenantId(req);
    }
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      return NextResponse.json({ success: false, error: 'No se pudo identificar el tenant' }, { status: 401 });
    }

    const body = await req.json();
    const propertyId = Number(body?.property_id);
    const dataUrl = String(body?.data_url || '');

    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return NextResponse.json({ success: false, error: 'property_id inválido' }, { status: 400 });
    }
    if (!isDataUrl(dataUrl)) {
      return NextResponse.json({ success: false, error: 'data_url inválido' }, { status: 400 });
    }
    // Límite defensivo: ~1.5MB en texto base64 (evita requests demasiado grandes)
    if (dataUrl.length > 1_500_000) {
      return NextResponse.json({ success: false, error: 'Imagen demasiado grande' }, { status: 413 });
    }

    // Verificar propiedad pertenece al tenant
    const exists = await sql`
      SELECT id, photos
      FROM tenant_properties
      WHERE id = ${propertyId} AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    if (exists.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Propiedad no encontrada' }, { status: 404 });
    }

    const currentPhotos = Array.isArray(exists.rows[0].photos) ? exists.rows[0].photos : [];
    const nextPhotos = [...currentPhotos, dataUrl].slice(0, 24);

    await sql`
      UPDATE tenant_properties
      SET photos = ${JSON.stringify(nextPhotos)}::jsonb, updated_at = NOW()
      WHERE id = ${propertyId} AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true, photosCount: nextPhotos.length });
  } catch (error) {
    console.error('❌ [properties/photos] Error:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

