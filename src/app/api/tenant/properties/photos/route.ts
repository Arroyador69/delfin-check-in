import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

function isDataUrl(s: string): boolean {
  return typeof s === 'string' && s.startsWith('data:image/');
}

function maxDataUrlLengthFor5MB(): number {
  // Aproximación: base64 expande ~4/3. Para 5MB binario -> ~6.7MB base64 + cabecera.
  // Dejamos margen para evitar falsos 413.
  return 8_500_000;
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
    // Límite defensivo alineado con el UI (5MB). El body llega como texto base64.
    if (dataUrl.length > maxDataUrlLengthFor5MB()) {
      return NextResponse.json({ success: false, error: 'Imagen demasiado grande (máximo 5MB)' }, { status: 413 });
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
    // Evitar duplicados por reintentos / doble submit.
    const withoutDup = currentPhotos.includes(dataUrl) ? currentPhotos : [...currentPhotos, dataUrl];
    const nextPhotos = withoutDup.slice(0, 24);

    await sql`
      UPDATE tenant_properties
      SET photos = ${JSON.stringify(nextPhotos)}::jsonb, updated_at = NOW()
      WHERE id = ${propertyId} AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true, photosCount: nextPhotos.length, photos: nextPhotos });
  } catch (error) {
    console.error('❌ [properties/photos] Error:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

