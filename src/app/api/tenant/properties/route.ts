// =====================================================
// API ENDPOINT: GESTIÓN DE PROPIEDADES
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { CreatePropertyRequest, UpdatePropertyRequest, TenantProperty } from '@/lib/direct-reservations-types';
import { getTenantId } from '@/lib/tenant';

// =====================================================
// GET: Obtener propiedades del tenant
// =====================================================

export async function GET(req: NextRequest) {
  try {
    // Hardening esquema: soportar pricing por persona extra
    try {
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS included_guests INT DEFAULT 2`;
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS extra_guest_fee DECIMAL(10,2) DEFAULT 0`;
    } catch (_) {}
    // Priorizar tenant_id desde JWT; si no está, caer al header (middleware)
    let tenantId = await getTenantId(req);
    if (!tenantId || tenantId.trim() === '') {
      tenantId = req.headers.get('x-tenant-id');
    }
    
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      console.error('❌ No se pudo identificar el tenant válido');
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }
    
    console.log('🏠 Obteniendo propiedades para tenant:', tenantId);
    
    // Unir propiedades existentes con placeholders derivados de Room sin mapping
    const result = await sql`
      WITH mapped AS (
        SELECT 
          tp.id, tp.tenant_id, tp.property_name, tp.description, tp.photos, tp.max_guests,
          tp.bedrooms, tp.bathrooms, tp.amenities, tp.base_price, tp.cleaning_fee,
          tp.security_deposit, tp.minimum_nights, tp.maximum_nights,
          tp.availability_rules, tp.is_active, tp.created_at, tp.updated_at,
          prm.room_id, FALSE AS is_placeholder
        FROM tenant_properties tp
        LEFT JOIN property_room_map prm
          ON prm.tenant_id = tp.tenant_id::uuid AND prm.property_id = tp.id
        WHERE tp.tenant_id = ${tenantId}::uuid
      ),
      placeholders AS (
      SELECT 
          NULL::int AS id,
          ${tenantId}::uuid AS tenant_id,
          r.name     AS property_name,
          NULL::text AS description,
          '[]'::jsonb AS photos,
          2 AS max_guests,
          1 AS bedrooms,
          1 AS bathrooms,
          '[]'::jsonb AS amenities,
          50.00::decimal(10,2) AS base_price,
          0.00::decimal(10,2) AS cleaning_fee,
          0.00::decimal(10,2) AS security_deposit,
          1 AS minimum_nights,
          30 AS maximum_nights,
          '{}'::jsonb AS availability_rules,
          TRUE AS is_active,
          NOW() AS created_at,
          NOW() AS updated_at,
          r.id AS room_id,
          TRUE AS is_placeholder
        FROM "Room" r
        LEFT JOIN property_room_map prm
          ON prm.tenant_id = ${tenantId}::uuid AND prm.room_id = r.id
        WHERE r."lodgingId" = ${tenantId}::text AND prm.room_id IS NULL
      )
      SELECT * FROM mapped
      UNION ALL
      SELECT * FROM placeholders
      ORDER BY created_at DESC
    `;
    
    const properties: any[] = result.rows.map(row => ({
      id: row.id,
      tenant_id: row.tenant_id,
      property_name: row.property_name,
      description: row.description,
      photos: row.photos || [],
      max_guests: row.max_guests,
      included_guests: row.included_guests ?? null,
      extra_guest_fee: row.extra_guest_fee != null ? parseFloat(String(row.extra_guest_fee)) : 0,
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
      updated_at: row.updated_at,
      room_id: row.room_id || null,
      is_placeholder: row.is_placeholder || false
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
    // Hardening esquema: soportar pricing por persona extra
    try {
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS included_guests INT DEFAULT 2`;
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS extra_guest_fee DECIMAL(10,2) DEFAULT 0`;
    } catch (_) {}
    // Obtener tenant_id del header (inyectado por middleware) o del token
    let tenantId = req.headers.get('x-tenant-id');
    
    // Validar que no sea 'default' o string vacío
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      tenantId = await getTenantId(req);
    }
    
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      console.error('❌ No se pudo identificar el tenant válido');
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }
    
    const data: CreatePropertyRequest & { room_id?: number } = await req.json();
    
    console.log('🏠 Creando nueva propiedad para tenant:', tenantId);
    console.log('📋 Datos de la propiedad:', data);
    
    // Validaciones básicas: obligamos a indicar el slot (room_id)
    if (!data.room_id) {
      return NextResponse.json(
        { success: false, error: 'room_id es obligatorio (slot a completar)' },
        { status: 400 }
      );
    }

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
    
    // Validar límite por plan usando el nuevo sistema de permisos
    const { validateUnitCreation } = await import('@/lib/permissions');
    const unitValidation = await validateUnitCreation(req);
    
    if (!unitValidation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: unitValidation.error,
          suggestion: 'Para añadir más unidades, actualiza a PRO o crea otra cuenta.',
          current_usage: unitValidation.tenant?.current_rooms || 0,
          max_allowed: unitValidation.tenant?.max_rooms || 2,
          plan_type: unitValidation.tenant?.plan_type || 'free'
        },
        { status: unitValidation.status || 403 }
      );
    }
    
    const tenant = unitValidation.tenant;
    const maxRooms = tenant.max_rooms;
    const roomsCount = tenant.current_rooms;

    // Comprobar si el room_id ya está mapeado a una propiedad
    const mapping = await sql`
      SELECT prm.property_id FROM property_room_map prm
      WHERE prm.tenant_id = ${tenantId}::uuid AND prm.room_id = ${data.room_id}
      LIMIT 1
    `;

    let propertyId: number;
    if (mapping.rows.length > 0) {
      // Actualizar la propiedad existente (upsert por slot)
      propertyId = mapping.rows[0].property_id;
      await sql`
        UPDATE tenant_properties SET
          property_name = ${data.property_name},
          description   = ${data.description || ''},
          photos        = ${JSON.stringify(data.photos || [])},
          max_guests    = ${data.max_guests || 2},
          included_guests = ${data.included_guests ?? Math.min(2, data.max_guests || 2)},
          extra_guest_fee = ${data.extra_guest_fee ?? 0},
          bedrooms      = ${data.bedrooms || 1},
          bathrooms     = ${data.bathrooms || 1},
          amenities     = ${JSON.stringify(data.amenities || [])},
          base_price    = ${data.base_price},
          cleaning_fee  = ${data.cleaning_fee || 0},
          security_deposit = ${data.security_deposit || 0},
          minimum_nights = ${data.minimum_nights || 1},
          maximum_nights = ${data.maximum_nights || 30},
          availability_rules = ${JSON.stringify(data.availability_rules || {})},
          updated_at    = NOW()
        WHERE id = ${propertyId} AND tenant_id = ${tenantId}
      `;
    } else {
      // Crear nueva propiedad y mapping para ese room_id
      const created = await sql`
      INSERT INTO tenant_properties (
        tenant_id, property_name, description, photos, max_guests, included_guests, extra_guest_fee,
        bedrooms, bathrooms, amenities, base_price, cleaning_fee,
        security_deposit, minimum_nights, maximum_nights, availability_rules
      ) VALUES (
        ${tenantId},
        ${data.property_name},
        ${data.description || ''},
        ${JSON.stringify(data.photos || [])},
        ${data.max_guests || 2},
        ${data.included_guests ?? Math.min(2, data.max_guests || 2)},
        ${data.extra_guest_fee ?? 0},
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
      propertyId = created.rows[0].id;
      await sql`
        INSERT INTO property_room_map (tenant_id, property_id, room_id, created_at, updated_at)
        VALUES (${tenantId}::uuid, ${propertyId}, ${data.room_id}, NOW(), NOW())
        ON CONFLICT (tenant_id, property_id) DO UPDATE SET room_id = EXCLUDED.room_id, updated_at = NOW()
      `;
    }
    
    console.log('✅ Propiedad asignada al slot (room_id):', data.room_id, '-> property_id:', propertyId);
    
    return NextResponse.json({
      success: true,
      property_id: propertyId,
      message: 'Propiedad guardada correctamente (slot completado)'
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
    // Hardening esquema: soportar pricing por persona extra
    try {
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS included_guests INT DEFAULT 2`;
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS extra_guest_fee DECIMAL(10,2) DEFAULT 0`;
    } catch (_) {}
    // Obtener tenant_id del header (inyectado por middleware) o del token
    let tenantId = req.headers.get('x-tenant-id');
    
    // Validar que no sea 'default' o string vacío
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      tenantId = await getTenantId(req);
    }
    
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      console.error('❌ No se pudo identificar el tenant válido');
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }
    
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

    if ((data as any).included_guests !== undefined) {
      updateFields.push('included_guests = $' + (updateValues.length + 1));
      updateValues.push((data as any).included_guests);
    }

    if ((data as any).extra_guest_fee !== undefined) {
      updateFields.push('extra_guest_fee = $' + (updateValues.length + 1));
      updateValues.push((data as any).extra_guest_fee);
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
    // Obtener tenant_id del header (inyectado por middleware) o del token
    let tenantId = req.headers.get('x-tenant-id');
    
    // Validar que no sea 'default' o string vacío
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      tenantId = await getTenantId(req);
    }
    
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      console.error('❌ No se pudo identificar el tenant válido');
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }
    
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
