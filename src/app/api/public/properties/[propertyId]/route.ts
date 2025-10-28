// =====================================================
// API PÚBLICA: OBTENER PROPIEDADES PARA RESERVAS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { TenantProperty } from '@/lib/direct-reservations-types';

export async function GET(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenant_id requerido' },
        { status: 400 }
      );
    }

    console.log('🏠 Obteniendo propiedad pública:', { propertyId: params.propertyId, tenantId });
    
    const result = await sql`
      SELECT 
        id, tenant_id, property_name, description, photos, max_guests,
        bedrooms, bathrooms, amenities, base_price, cleaning_fee,
        security_deposit, minimum_nights, maximum_nights,
        availability_rules, is_active, created_at, updated_at
      FROM tenant_properties 
      WHERE id = ${params.propertyId} AND tenant_id = ${tenantId} AND is_active = true
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }
    
    const property: TenantProperty = {
      id: result.rows[0].id,
      tenant_id: result.rows[0].tenant_id,
      property_name: result.rows[0].property_name,
      description: result.rows[0].description,
      photos: result.rows[0].photos || [],
      max_guests: result.rows[0].max_guests,
      bedrooms: result.rows[0].bedrooms,
      bathrooms: result.rows[0].bathrooms,
      amenities: result.rows[0].amenities || [],
      base_price: parseFloat(result.rows[0].base_price),
      cleaning_fee: parseFloat(result.rows[0].cleaning_fee || '0'),
      security_deposit: parseFloat(result.rows[0].security_deposit || '0'),
      minimum_nights: result.rows[0].minimum_nights,
      maximum_nights: result.rows[0].maximum_nights,
      availability_rules: result.rows[0].availability_rules || {},
      is_active: result.rows[0].is_active,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at
    };
    
    console.log('✅ Propiedad encontrada:', property.property_name);
    
    return NextResponse.json({
      success: true,
      property
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo propiedad pública:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
