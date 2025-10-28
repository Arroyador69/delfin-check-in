// =====================================================
// API ENDPOINT: GESTIÓN DE PROPIEDADES
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { CreatePropertyRequest, UpdatePropertyRequest, TenantProperty } from '@/lib/direct-reservations-types';

// =====================================================
// GET: Obtener propiedades del tenant
// =====================================================

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    
    console.log('🏠 Obteniendo propiedades para tenant:', tenantId);
    
    const result = await sql`
      SELECT 
        id, tenant_id, property_name, description, photos, max_guests,
        bedrooms, bathrooms, amenities, base_price, cleaning_fee,
        security_deposit, minimum_nights, maximum_nights,
        availability_rules, is_active, created_at, updated_at
      FROM tenant_properties 
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;
    
    const properties: TenantProperty[] = result.rows.map(row => ({
      id: row.id,
      tenant_id: row.tenant_id,
      property_name: row.property_name,
      description: row.description,
      photos: row.photos || [],
      max_guests: row.max_guests,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      amenities: row.amenities || [],
      base_price: parseFloat(row.base_price),
      cleaning_fee: parseFloat(row.cleaning_fee || '0'),
      security_deposit: parseFloat(row.security_deposit || '0'),
      minimum_nights: row.minimum_nights,
      maximum_nights: row.maximum_nights,
      availability_rules: row.availability_rules || {},
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    console.log(`✅ Encontradas ${properties.length} propiedades`);
    
    return NextResponse.json({
      success: true,
      properties,
      total: properties.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo propiedades:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST: Crear nueva propiedad
// =====================================================

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const data: CreatePropertyRequest = await req.json();
    
    console.log('🏠 Creando nueva propiedad para tenant:', tenantId);
    console.log('📋 Datos de la propiedad:', data);
    
    // Validaciones básicas
    if (!data.property_name || !data.base_price) {
      return NextResponse.json(
        { success: false, error: 'Nombre y precio base son obligatorios' },
        { status: 400 }
      );
    }
    
    if (data.base_price <= 0) {
      return NextResponse.json(
        { success: false, error: 'El precio base debe ser mayor a 0' },
        { status: 400 }
      );
    }
    
    // Insertar propiedad
    const result = await sql`
      INSERT INTO tenant_properties (
        tenant_id, property_name, description, photos, max_guests,
        bedrooms, bathrooms, amenities, base_price, cleaning_fee,
        security_deposit, minimum_nights, maximum_nights, availability_rules
      ) VALUES (
        ${tenantId},
        ${data.property_name},
        ${data.description || ''},
        ${JSON.stringify(data.photos || [])},
        ${data.max_guests || 2},
        ${data.bedrooms || 1},
        ${data.bathrooms || 1},
        ${JSON.stringify(data.amenities || [])},
        ${data.base_price},
        ${data.cleaning_fee || 0},
        ${data.security_deposit || 0},
        ${data.minimum_nights || 1},
        ${data.maximum_nights || 30},
        ${JSON.stringify(data.availability_rules || {})}
      )
      RETURNING id, created_at
    `;
    
    const newProperty = result.rows[0];
    
    console.log('✅ Propiedad creada con ID:', newProperty.id);
    
    return NextResponse.json({
      success: true,
      property_id: newProperty.id,
      message: 'Propiedad creada correctamente',
      created_at: newProperty.created_at
    });
    
  } catch (error) {
    console.error('❌ Error creando propiedad:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT: Actualizar propiedad existente
// =====================================================

export async function PUT(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('id');
    
    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: 'ID de propiedad requerido' },
        { status: 400 }
      );
    }
    
    const data: UpdatePropertyRequest = await req.json();
    
    console.log('🏠 Actualizando propiedad ID:', propertyId, 'para tenant:', tenantId);
    
    // Verificar que la propiedad pertenece al tenant
    const existingProperty = await sql`
      SELECT id FROM tenant_properties 
      WHERE id = ${propertyId} AND tenant_id = ${tenantId}
    `;
    
    if (existingProperty.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }
    
    // Construir query de actualización dinámicamente
    const updateFields = [];
    const updateValues = [];
    
    if (data.property_name !== undefined) {
      updateFields.push('property_name = $' + (updateValues.length + 1));
      updateValues.push(data.property_name);
    }
    
    if (data.description !== undefined) {
      updateFields.push('description = $' + (updateValues.length + 1));
      updateValues.push(data.description);
    }
    
    if (data.photos !== undefined) {
      updateFields.push('photos = $' + (updateValues.length + 1));
      updateValues.push(JSON.stringify(data.photos));
    }
    
    if (data.max_guests !== undefined) {
      updateFields.push('max_guests = $' + (updateValues.length + 1));
      updateValues.push(data.max_guests);
    }
    
    if (data.bedrooms !== undefined) {
      updateFields.push('bedrooms = $' + (updateValues.length + 1));
      updateValues.push(data.bedrooms);
    }
    
    if (data.bathrooms !== undefined) {
      updateFields.push('bathrooms = $' + (updateValues.length + 1));
      updateValues.push(data.bathrooms);
    }
    
    if (data.amenities !== undefined) {
      updateFields.push('amenities = $' + (updateValues.length + 1));
      updateValues.push(JSON.stringify(data.amenities));
    }
    
    if (data.base_price !== undefined) {
      updateFields.push('base_price = $' + (updateValues.length + 1));
      updateValues.push(data.base_price);
    }
    
    if (data.cleaning_fee !== undefined) {
      updateFields.push('cleaning_fee = $' + (updateValues.length + 1));
      updateValues.push(data.cleaning_fee);
    }
    
    if (data.security_deposit !== undefined) {
      updateFields.push('security_deposit = $' + (updateValues.length + 1));
      updateValues.push(data.security_deposit);
    }
    
    if (data.minimum_nights !== undefined) {
      updateFields.push('minimum_nights = $' + (updateValues.length + 1));
      updateValues.push(data.minimum_nights);
    }
    
    if (data.maximum_nights !== undefined) {
      updateFields.push('maximum_nights = $' + (updateValues.length + 1));
      updateValues.push(data.maximum_nights);
    }
    
    if (data.availability_rules !== undefined) {
      updateFields.push('availability_rules = $' + (updateValues.length + 1));
      updateValues.push(JSON.stringify(data.availability_rules));
    }
    
    if (data.is_active !== undefined) {
      updateFields.push('is_active = $' + (updateValues.length + 1));
      updateValues.push(data.is_active);
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }
    
    // Agregar updated_at
    updateFields.push('updated_at = NOW()');
    
    const query = `
      UPDATE tenant_properties 
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length + 1} AND tenant_id = $${updateValues.length + 2}
      RETURNING updated_at
    `;
    
    updateValues.push(propertyId, tenantId);
    
    const result = await sql.query(query, updateValues);
    
    console.log('✅ Propiedad actualizada correctamente');
    
    return NextResponse.json({
      success: true,
      message: 'Propiedad actualizada correctamente',
      updated_at: result.rows[0].updated_at
    });
    
  } catch (error) {
    console.error('❌ Error actualizando propiedad:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE: Eliminar propiedad
// =====================================================

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('id');
    
    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: 'ID de propiedad requerido' },
        { status: 400 }
      );
    }
    
    console.log('🏠 Eliminando propiedad ID:', propertyId, 'para tenant:', tenantId);
    
    // Verificar que la propiedad pertenece al tenant
    const existingProperty = await sql`
      SELECT id FROM tenant_properties 
      WHERE id = ${propertyId} AND tenant_id = ${tenantId}
    `;
    
    if (existingProperty.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar si hay reservas activas
    const activeReservations = await sql`
      SELECT COUNT(*) as count FROM direct_reservations 
      WHERE property_id = ${propertyId} 
      AND reservation_status IN ('confirmed', 'pending')
    `;
    
    if (parseInt(activeReservations.rows[0].count) > 0) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar una propiedad con reservas activas' },
        { status: 400 }
      );
    }
    
    // Eliminar propiedad
    await sql`
      DELETE FROM tenant_properties 
      WHERE id = ${propertyId} AND tenant_id = ${tenantId}
    `;
    
    console.log('✅ Propiedad eliminada correctamente');
    
    return NextResponse.json({
      success: true,
      message: 'Propiedad eliminada correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error eliminando propiedad:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
