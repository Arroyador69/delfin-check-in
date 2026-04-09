// =====================================================
// API PÚBLICA: OBTENER PROPIEDADES PARA RESERVAS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { TenantProperty } from '@/lib/direct-reservations-types';

function corsHeaders(origin: string | null) {
  const allowedOrigins = [
    'https://book.delfincheckin.com',
    'https://admin.delfincheckin.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  
  const originHeader = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': originHeader,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const origin = req.headers.get('origin');
    const { propertyId } = await params;
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');

    // Hardening esquema: soportar pricing por persona extra
    try {
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS included_guests INT DEFAULT 2`;
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS extra_guest_fee DECIMAL(10,2) DEFAULT 0`;
    } catch (_) {}
    
    if (!tenantId) {
      const response = NextResponse.json(
        { success: false, error: 'tenant_id requerido' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    console.log('🏠 Obteniendo propiedad pública:', { propertyId, tenantId });
    
    const result = await sql`
      SELECT 
        id, tenant_id, property_name, description, photos, max_guests,
        included_guests, extra_guest_fee,
        bedrooms, bathrooms, amenities, base_price, cleaning_fee,
        security_deposit, minimum_nights, maximum_nights,
        availability_rules, is_active, created_at, updated_at
      FROM tenant_properties 
      WHERE id = ${propertyId} AND tenant_id = ${tenantId} AND is_active = true
    `;
    
    if (result.rows.length === 0) {
      const response = NextResponse.json(
        { success: false, error: 'Propiedad no encontrada' },
        { status: 404 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
    
    const property: TenantProperty = {
      id: result.rows[0].id,
      tenant_id: result.rows[0].tenant_id,
      property_name: result.rows[0].property_name,
      description: result.rows[0].description,
      photos: result.rows[0].photos || [],
      max_guests: result.rows[0].max_guests,
      included_guests: result.rows[0].included_guests ?? undefined,
      extra_guest_fee: result.rows[0].extra_guest_fee != null ? parseFloat(String(result.rows[0].extra_guest_fee)) : undefined,
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
    
    const response = NextResponse.json({
      success: true,
      property
    });
    
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ Error obteniendo propiedad pública:', error);
    const origin = req.headers.get('origin');
    const response = NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}
