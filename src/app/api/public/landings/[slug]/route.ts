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

    // Obtener el lodging_id del tenant para buscar las habitaciones reales
    const tenantInfo = await sql`
      SELECT lodging_id
      FROM tenants
      WHERE id = ${landing.tenant_id}::uuid
      LIMIT 1
    `;
    
    const lodgingId = tenantInfo.rows[0]?.lodging_id || null;

    // Obtener TODAS las habitaciones activas del tenant desde la tabla Room
    // Combinamos con tenant_properties si hay mapping en property_room_map
    let roomsQuery;
    if (lodgingId) {
      roomsQuery = sql`
        SELECT 
          r.id as room_id,
          r.name as room_name,
          tp.id as property_id,
          tp.property_name,
          COALESCE(tp.description, '') as description,
          COALESCE(tp.photos, '[]'::jsonb) as photos,
          COALESCE(tp.max_guests, 2) as max_guests,
          COALESCE(tp.bedrooms, 1) as bedrooms,
          COALESCE(tp.bathrooms, 1) as bathrooms,
          COALESCE(tp.amenities, '[]'::jsonb) as amenities,
          COALESCE(tp.base_price, 50.00) as base_price,
          COALESCE(tp.cleaning_fee, 0.00) as cleaning_fee,
          COALESCE(tp.security_deposit, 0.00) as security_deposit,
          COALESCE(tp.minimum_nights, 1) as minimum_nights,
          COALESCE(tp.maximum_nights, 30) as maximum_nights,
          COALESCE(tp.is_active, true) as is_active,
          CASE WHEN tp.id IS NOT NULL THEN true ELSE false END as has_property_mapping
        FROM "Room" r
        LEFT JOIN property_room_map prm ON prm.room_id = r.id::text AND prm.tenant_id = ${landing.tenant_id}::uuid
        LEFT JOIN tenant_properties tp ON tp.id = prm.property_id AND tp.is_active = true
        WHERE r."lodgingId" = ${lodgingId}::text
        ORDER BY r.id ASC
      `;
    } else {
      // Fallback: usar tenant_id directamente (compatibilidad antigua)
      roomsQuery = sql`
        SELECT 
          r.id as room_id,
          r.name as room_name,
          tp.id as property_id,
          tp.property_name,
          COALESCE(tp.description, '') as description,
          COALESCE(tp.photos, '[]'::jsonb) as photos,
          COALESCE(tp.max_guests, 2) as max_guests,
          COALESCE(tp.bedrooms, 1) as bedrooms,
          COALESCE(tp.bathrooms, 1) as bathrooms,
          COALESCE(tp.amenities, '[]'::jsonb) as amenities,
          COALESCE(tp.base_price, 50.00) as base_price,
          COALESCE(tp.cleaning_fee, 0.00) as cleaning_fee,
          COALESCE(tp.security_deposit, 0.00) as security_deposit,
          COALESCE(tp.minimum_nights, 1) as minimum_nights,
          COALESCE(tp.maximum_nights, 30) as maximum_nights,
          COALESCE(tp.is_active, true) as is_active,
          CASE WHEN tp.id IS NOT NULL THEN true ELSE false END as has_property_mapping
        FROM "Room" r
        LEFT JOIN property_room_map prm ON prm.room_id = r.id::text AND prm.tenant_id = ${landing.tenant_id}::uuid
        LEFT JOIN tenant_properties tp ON tp.id = prm.property_id AND tp.is_active = true
        WHERE r."lodgingId" = ${landing.tenant_id}::text
        ORDER BY r.id ASC
      `;
    }

    const propertiesResult = await roomsQuery;

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
        id: p.property_id || parseInt(p.room_id), // Usar property_id si existe, sino room_id
        room_id: parseInt(p.room_id),
        property_name: p.property_name || p.room_name, // Usar property_name si existe, sino room_name
        room_name: p.room_name,
        description: p.description || '',
        photos: Array.isArray(p.photos) ? p.photos : (p.photos ? JSON.parse(p.photos) : []),
        max_guests: p.max_guests || 2,
        bedrooms: p.bedrooms || 1,
        bathrooms: p.bathrooms || 1,
        amenities: Array.isArray(p.amenities) ? p.amenities : (p.amenities ? JSON.parse(p.amenities) : []),
        base_price: parseFloat(p.base_price || '50'),
        cleaning_fee: parseFloat(p.cleaning_fee || '0'),
        security_deposit: parseFloat(p.security_deposit || '0'),
        minimum_nights: p.minimum_nights || 1,
        maximum_nights: p.maximum_nights || 30,
        has_property_mapping: p.has_property_mapping || false
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

