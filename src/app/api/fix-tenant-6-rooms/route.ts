import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * 🔧 API para arreglar tu tenant y configurarlo con 6 habitaciones
 * 
 * Esta API actualiza tu tenant para que tenga límite de 6 habitaciones
 * y crea las 6 habitaciones en la base de datos
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Arreglando tenant para 6 habitaciones...');
    
    // Tu tenant ID (el que está en el sistema)
    const tenantId = '870e589f-d313-4a5a-901f-f25fd4e7240a';
    
    // 1. Actualizar el tenant para que tenga límite de 6 habitaciones
    console.log('📝 Actualizando límite de habitaciones a 6...');
    const updateResult = await sql`
      UPDATE tenants 
      SET max_rooms = 6, updated_at = NOW()
      WHERE id = ${tenantId}
    `;
    
    if (updateResult.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tenant no encontrado'
      }, { status: 404 });
    }
    
    // 2. Obtener información del tenant
    const tenantResult = await sql`
      SELECT lodging_id, name, max_rooms FROM tenants WHERE id = ${tenantId}
    `;
    
    const tenant = tenantResult.rows[0];
    const lodgingId = tenant.lodging_id;
    console.log('🏠 Tenant:', tenant.name, 'Lodging ID:', lodgingId, 'Max Rooms:', tenant.max_rooms);
    
    // 3. Crear las 6 habitaciones
    const rooms = [
      { id: '1', name: 'Habitación 1' },
      { id: '2', name: 'Habitación 2' },
      { id: '3', name: 'Habitación 3' },
      { id: '4', name: 'Habitación 4' },
      { id: '5', name: 'Habitación 5' },
      { id: '6', name: 'Habitación 6' }
    ];
    
    console.log('🏠 Creando las 6 habitaciones...');
    const createdRooms = [];
    
    for (const room of rooms) {
      // Verificar si la habitación ya existe
      const existingRoom = await sql`
        SELECT id FROM "Room" 
        WHERE id = ${room.id} AND "lodgingId" = ${lodgingId}
      `;
      
      if (existingRoom.rows.length > 0) {
        // Actualizar habitación existente
        await sql`
          UPDATE "Room" 
          SET name = ${room.name}, updated_at = NOW()
          WHERE id = ${room.id} AND "lodgingId" = ${lodgingId}
        `;
        console.log(`✅ Actualizada: ${room.name}`);
        createdRooms.push({ id: room.id, name: room.name, action: 'updated' });
      } else {
        // Crear nueva habitación
        await sql`
          INSERT INTO "Room" (id, name, "lodgingId", created_at, updated_at)
          VALUES (${room.id}, ${room.name}, ${lodgingId}, NOW(), NOW())
        `;
        console.log(`✅ Creada: ${room.name}`);
        createdRooms.push({ id: room.id, name: room.name, action: 'created' });
      }
    }
    
    // 4. Verificar el resultado final
    const finalCheck = await sql`
      SELECT COUNT(*) as total_rooms
      FROM "Room" 
      WHERE "lodgingId" = ${lodgingId}
    `;
    
    const tenantCheck = await sql`
      SELECT name, max_rooms 
      FROM tenants 
      WHERE id = ${tenantId}
    `;
    
    console.log('🎉 ¡Configuración completada!');
    console.log(`📊 Tenant: ${tenantCheck.rows[0].name}`);
    console.log(`📊 Límite de habitaciones: ${tenantCheck.rows[0].max_rooms}`);
    console.log(`📊 Habitaciones en BD: ${finalCheck.rows[0].total_rooms}`);
    
    return NextResponse.json({
      success: true,
      message: '¡Tu tenant está configurado con 6 habitaciones!',
      tenant: {
        id: tenantId,
        name: tenantCheck.rows[0].name,
        max_rooms: tenantCheck.rows[0].max_rooms
      },
      rooms: {
        total: finalCheck.rows[0].total_rooms,
        details: createdRooms
      },
      instructions: [
        '1. Recarga la página de configuración',
        '2. Ahora deberías ver que puedes configurar hasta 6 habitaciones',
        '3. Las 6 habitaciones ya están creadas en la base de datos',
        '4. Puedes cambiar los nombres y guardar la configuración'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error arreglando tenant:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error arreglando tenant',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
