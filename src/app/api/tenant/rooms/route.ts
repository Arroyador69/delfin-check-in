import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({
        success: false,
        error: 'No se pudo identificar el tenant'
      }, { status: 400 });
    }

    const result = await sql`
      SELECT id, name
      FROM "Room"
      WHERE "lodgingId" = (
        SELECT lodging_id FROM tenants WHERE id = ${tenantId}
      )
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
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({
        success: false,
        error: 'No se pudo identificar el tenant'
      }, { status: 400 });
    }
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

    // Obtener lodging_id
    const lodgingResult = await sql`
      SELECT lodging_id FROM tenants WHERE id = ${tenantId}
    `;
    const lodgingId = lodgingResult.rows[0]?.lodging_id;
    
    if (!lodgingId) {
      return NextResponse.json({
        success: false,
        message: 'No se encontró el lodging asociado al tenant'
      }, { status: 404 });
    }

    // Obtener conteo actual de habitaciones
    const existingRoomsCount = await sql`
      SELECT COUNT(*) as count 
      FROM "Room" r
      WHERE r."lodgingId" = ${lodgingId}
    `;
    const currentCount = parseInt(existingRoomsCount.rows[0]?.count || '0', 10);
    
    // Validar que puede crear las nuevas habitaciones
    const { canCreateUnit } = await import('@/lib/tenant');
    const validation = canCreateUnit(tenant, currentCount + rooms.length);
    
    if (!validation.canCreate) {
      const planType = tenant.plan_type || 'free';
      let errorMessage = validation.reason || 'No puedes crear más habitaciones';
      
      // Mensajes personalizados según el plan
      if (planType === 'free' && currentCount >= 2) {
        errorMessage = 'Has alcanzado el límite de 2 habitaciones del Plan Gratis. Actualiza a Plan Check-in (8€/mes) o Plan Pro (29,99€/mes) para añadir más habitaciones.';
      } else if (planType === 'checkin') {
        errorMessage = `Puedes añadir más habitaciones, pero cada una adicional costará 4€/mes. Actualmente tienes ${currentCount} habitaciones.`;
      } else if (planType === 'pro' && currentCount >= 6) {
        errorMessage = `Has alcanzado las 6 habitaciones incluidas en Plan Pro. Las habitaciones adicionales tendrán un coste extra de 5€/mes cada una.`;
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        current_usage: currentCount,
        max_included: planType === 'free' ? 2 : planType === 'pro' ? 6 : null,
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

    // Procesar cada habitación
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const roomId = room.id.toString();
      
      // Verificar si la habitación ya existe
      const existingRoom = existingRooms.rows.find(r => r.id === roomId);
      
      if (existingRoom) {
        // Actualizar habitación existente
        await sql`
          UPDATE "Room"
          SET name = ${room.name}, updated_at = NOW()
          WHERE id = ${roomId} AND "lodgingId" = ${lodgingId}
        `;
        console.log(`✅ Actualizada habitación ${roomId}: ${room.name}`);
      } else {
        // Crear nueva habitación
        await sql`
          INSERT INTO "Room" (id, name, "lodgingId", created_at, updated_at)
          VALUES (${roomId}, ${room.name}, ${lodgingId}, NOW(), NOW())
        `;
        console.log(`✅ Creada nueva habitación ${roomId}: ${room.name}`);
      }
    }

    // Eliminar habitaciones que excedan el límite (si es necesario)
    if (rooms.length < maxRooms) {
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
