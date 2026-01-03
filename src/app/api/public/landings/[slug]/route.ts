import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// =====================================================
// GET: Obtener landing dinámica por slug (pública)
// =====================================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug requerido' },
        { status: 400 }
      );
    }

    // Obtener la landing
    let query = sql`
      SELECT 
        dl.*,
        tp.property_name,
        tp.description as property_description,
        tp.photos as property_photos,
        t.name as tenant_name,
        t.email as tenant_email
      FROM dynamic_landings dl
      JOIN tenant_properties tp ON dl.property_id = tp.id
      JOIN tenants t ON dl.tenant_id = t.id
      WHERE dl.slug = ${slug}
        AND dl.status = 'active'
        AND dl.is_published = true
    `;

    if (tenantId) {
      query = sql`${query} AND dl.tenant_id = ${tenantId}::uuid`;
    }

    const result = await query;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Landing no encontrada o no publicada' },
        { status: 404 }
      );
    }

    const landing = result.rows[0];

    // Obtener TODAS las propiedades/habitaciones activas del property (en este caso, como el sistema usa tenant_properties,
    // obtenemos todas las propiedades activas del tenant para mostrar como "habitaciones")
    // NOTA: Según el requerimiento, debemos mostrar TODAS las habitaciones activas del property
    // Como el sistema usa tenant_properties, vamos a obtener todas las propiedades activas del tenant
    const propertiesResult = await sql`
      SELECT 
        id,
        property_name,
        description,
        photos,
        max_guests,
        bedrooms,
        bathrooms,
        amenities,
        base_price,
        cleaning_fee,
        security_deposit,
        minimum_nights,
        maximum_nights,
        is_active
      FROM tenant_properties
      WHERE tenant_id = ${landing.tenant_id}::uuid
        AND is_active = true
      ORDER BY base_price ASC, property_name ASC
    `;

    // Incrementar contador de vistas (solo si es una vista nueva, no en cada refresh)
    // Por simplicidad, lo hacemos aquí, pero en producción deberías usar sesiones o similar
    await sql`
      UPDATE dynamic_landings
      SET views = views + 1, updated_at = NOW()
      WHERE id = ${landing.id}
    `;

    return NextResponse.json({
      success: true,
      landing: {
        id: landing.id,
        property_id: landing.property_id,
        tenant_id: landing.tenant_id,
        slug: landing.slug,
        content: landing.content,
        target_date_start: landing.target_date_start,
        target_date_end: landing.target_date_end,
        target_keywords: landing.target_keywords,
        target_audience: landing.target_audience,
        property_name: landing.property_name,
        property_description: landing.property_description,
        property_photos: landing.property_photos,
        tenant_name: landing.tenant_name
      },
      properties: propertiesResult.rows.map(p => ({
        id: p.id,
        property_name: p.property_name,
        description: p.description,
        photos: p.photos || [],
        max_guests: p.max_guests,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        amenities: p.amenities || [],
        base_price: parseFloat(p.base_price),
        cleaning_fee: parseFloat(p.cleaning_fee || '0'),
        security_deposit: parseFloat(p.security_deposit || '0'),
        minimum_nights: p.minimum_nights,
        maximum_nights: p.maximum_nights
      }))
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo landing:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

