import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    // Priorizar tenant_id desde JWT; si no está, caer al header (middleware)
    let tenantId = await getTenantId(req);
    if (!tenantId || tenantId.trim() === '') {
      tenantId = req.headers.get('x-tenant-id');
    }
    
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'No se pudo identificar el tenant'
      }, { status: 401 });
    }

    // Obtener lodging_id (usar tenant_id como fallback si no existe)
    const lodgingResult = await sql`
      SELECT lodging_id FROM tenants WHERE id = ${tenantId}
    `;
    const lodgingId = lodgingResult.rows[0]?.lodging_id || tenantId;
    
    const result = await sql`
      SELECT id, name
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
      ORDER BY id ASC
    `;

    const rooms = result.rows.map(row => ({
      id: parseInt(row.id),
      name: row.name
    }));

    return NextResponse.json({
      success: true,
      rooms: rooms
    });

  } catch (error) {
    console.error('Error obteniendo habitaciones:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo habitaciones',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Priorizar tenant_id desde JWT; si no está, caer al header (middleware)
    let tenantId = await getTenantId(req);
    if (!tenantId || tenantId.trim() === '') {
      tenantId = req.headers.get('x-tenant-id');
    }
    
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      console.error('❌ [POST /api/tenant/rooms] No se pudo identificar el tenant válido');
      return NextResponse.json({
        success: false,
        error: 'No se pudo identificar el tenant'
      }, { status: 401 });
    }
    
    console.log('🏢 [POST /api/tenant/rooms] Tenant identificado:', tenantId);
    const { rooms } = await req.json();

    if (!Array.isArray(rooms)) {
      return NextResponse.json({
        success: false,
        message: 'Formato de datos inválido'
      }, { status: 400 });
    }

    // Validar límite por plan usando el nuevo sistema de permisos
    const { validateUnitCreation } = await import('@/lib/permissions');
    const { getTenantById } = await import('@/lib/tenant');
    
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({
        success: false,
        message: 'Tenant no encontrado'
      }, { status: 404 });
    }

    // SIEMPRE verificar y crear el registro en Lodging antes de insertar habitaciones
    // Esto asegura que el foreign key constraint se satisfaga
    let lodgingId: string;
    
    try {
      // Primero, intentar crear la tabla Lodging si no existe
      await sql`
        CREATE TABLE IF NOT EXISTS "Lodging" (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      console.log(`✅ Tabla Lodging verificada/creada`);
      
      // Verificar si ya existe un registro en Lodging para este tenant
      const existingLodging = await sql`
        SELECT id FROM "Lodging" 
        WHERE id::text = ${tenantId}::text
        LIMIT 1
      `;
      
      if (existingLodging.rows.length > 0) {
        // Ya existe, usar ese ID
        lodgingId = existingLodging.rows[0].id;
        console.log(`✅ Encontrado registro existente en Lodging: ${lodgingId}`);
      } else {
        // Crear el registro en Lodging
        const insertResult = await sql`
          INSERT INTO "Lodging" (id, name, created_at, updated_at)
          VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET name = ${tenant.name || 'Mi Propiedad'}, updated_at = NOW()
          RETURNING id
        `;
        
        if (insertResult.rows.length > 0) {
          lodgingId = insertResult.rows[0].id;
          console.log(`✅ Creado registro en Lodging: ${lodgingId}`);
        } else {
          // Si aún no se creó, intentar obtenerlo de nuevo
          const retryCheck = await sql`
            SELECT id FROM "Lodging" WHERE id::text = ${tenantId}::text LIMIT 1
          `;
          if (retryCheck.rows.length > 0) {
            lodgingId = retryCheck.rows[0].id;
            console.log(`✅ Registro encontrado después del INSERT: ${lodgingId}`);
          } else {
            throw new Error('No se pudo crear ni encontrar registro en Lodging después de múltiples intentos');
          }
        }
      }
      
      // Actualizar tenants.lodging_id para futuras consultas
      try {
        await sql`
          UPDATE tenants 
          SET lodging_id = ${lodgingId}::text 
          WHERE id = ${tenantId}::uuid
        `;
        console.log(`✅ Actualizado lodging_id en tenants: ${lodgingId}`);
      } catch (updateError: any) {
        console.warn(`⚠️ No se pudo actualizar lodging_id en tenants:`, updateError.message);
        // No es crítico, continuar
      }
      
    } catch (error: any) {
      console.error(`❌ Error crítico creando/verificando Lodging:`, error);
      return NextResponse.json({
        success: false,
        error: `No se pudo configurar el lodging para este tenant. Por favor, contacta al soporte. Error: ${error.message}`
      }, { status: 500 });
    }

    // Obtener conteo actual de habitaciones
    const existingRoomsCount = await sql`
      SELECT COUNT(*) as count 
      FROM "Room" r
      WHERE r."lodgingId" = ${lodgingId}
    `;
    const currentCount = parseInt(existingRoomsCount.rows[0]?.count || '0', 10);
    
    // Validar que puede crear las nuevas habitaciones
    // IMPORTANTE: Validar el número FINAL de habitaciones, no el incremento
    const finalCount = rooms.length; // Después de eliminar y recrear, será el número total
    const { canCreateUnit } = await import('@/lib/tenant');
    const validation = canCreateUnit(tenant, finalCount);
    
    console.log(`🔍 [POST /api/tenant/rooms] Validación:`, {
      plan_type: tenant.plan_type,
      currentCount,
      finalCount,
      roomsToSave: rooms.length,
      canCreate: validation.canCreate,
      reason: validation.reason
    });
    
    if (!validation.canCreate) {
      const planType = tenant.plan_type || 'free';
      let errorMessage = validation.reason || 'No puedes crear más habitaciones';
      
      // Mensajes personalizados según el plan
      if (planType === 'free' && finalCount > 2) {
        errorMessage = 'Has alcanzado el límite de 2 propiedades del Plan Básico. Actualiza a Check-in, Standard o Pro para añadir más.';
      } else if (planType === 'checkin') {
        errorMessage = `Puedes añadir más propiedades; cada una adicional son 2€/mes. Actualmente tienes ${finalCount}.`;
      } else if (planType === 'standard' && finalCount > 4) {
        errorMessage = `Has superado las 4 propiedades incluidas en Standard. Las adicionales son 2€/mes cada una.`;
      } else if (planType === 'pro' && finalCount > 6) {
        errorMessage = `Has superado las 6 propiedades incluidas en Pro. Las adicionales son 2€/mes cada una.`;
      }
      
      console.error(`❌ [POST /api/tenant/rooms] Validación fallida:`, errorMessage);
      return NextResponse.json({
        success: false,
        error: errorMessage,
        current_usage: finalCount,
        max_included: planType === 'free' ? 2 : planType === 'standard' ? 4 : planType === 'pro' ? 6 : null,
        plan_type: planType,
        needs_upgrade: validation.needsUpgrade || false,
        upgrade_plan: validation.upgradePlan || null
      }, { status: 403 });
    }
    
    console.log(`🏢 Tenant ${tenantId} (${tenant.name}): Plan ${tenant.plan_type || 'free'}, ${currentCount} habitaciones actuales, creando ${rooms.length} nuevas`);

    // Obtener habitaciones existentes
    const existingRooms = await sql`
      SELECT id, name
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
      ORDER BY id ASC
    `;

    console.log('Habitaciones existentes:', existingRooms.rows);
    console.log('Habitaciones a guardar:', rooms);

    // Primero, eliminar todas las habitaciones existentes para evitar conflictos
    // Luego insertar las nuevas
    await sql`
      DELETE FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
    `;
    console.log(`🗑️ Eliminadas ${existingRooms.rows.length} habitaciones existentes para recrearlas`);

    // Insertar todas las habitaciones nuevas
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const roomId = room.id.toString();
      
      try {
        // Usar INSERT con ON CONFLICT para evitar duplicados
        await sql`
          INSERT INTO "Room" (id, name, "lodgingId", created_at, updated_at)
          VALUES (${roomId}, ${room.name}, ${lodgingId}, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE
          SET name = ${room.name}, updated_at = NOW(), "lodgingId" = ${lodgingId}
        `;
        console.log(`✅ Habitación ${roomId} guardada: ${room.name}`);
      } catch (insertError: any) {
        console.error(`❌ Error insertando habitación ${roomId}:`, insertError);
        // Si falla, intentar actualizar
        try {
          await sql`
            UPDATE "Room"
            SET name = ${room.name}, updated_at = NOW(), "lodgingId" = ${lodgingId}
            WHERE id = ${roomId}
          `;
          console.log(`✅ Habitación ${roomId} actualizada: ${room.name}`);
        } catch (updateError: any) {
          console.error(`❌ Error también al actualizar habitación ${roomId}:`, updateError);
          throw new Error(`No se pudo guardar la habitación ${roomId}: ${insertError.message}`);
        }
      }
    }

    // Eliminar habitaciones que excedan el límite del plan (si es necesario)
    // Solo eliminar si el usuario tiene menos habitaciones que el máximo permitido
    const maxRoomsAllowed = tenant.max_rooms === -1 ? Infinity : tenant.max_rooms;
    if (rooms.length < existingRooms.rows.length && maxRoomsAllowed !== Infinity) {
      // Eliminar habitaciones que excedan el límite
      const roomsToDelete = await sql`
        DELETE FROM "Room"
        WHERE "lodgingId" = ${lodgingId}
        AND id::integer > ${rooms.length}
        RETURNING id, name
      `;
      
      if (roomsToDelete.rows.length > 0) {
        console.log('🗑️ Habitaciones eliminadas:', roomsToDelete.rows);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración de habitaciones guardada correctamente',
      rooms: rooms
    });

  } catch (error) {
    console.error('Error guardando habitaciones:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error guardando habitaciones',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
