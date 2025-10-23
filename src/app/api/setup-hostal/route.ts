import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * 🏨 API para configurar tu hostal con 6 habitaciones
 * 
 * Este endpoint configura tu tenant para que tenga 6 habitaciones
 * según tu contrato con Delfín Check-in
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🏨 Configurando hostal con 6 habitaciones...');
    
    // Obtener tenant_id del header
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({
        success: false,
        error: 'No se pudo identificar el tenant'
      }, { status: 400 });
    }
    
    // 1. Actualizar el tenant para que tenga límite de 6 habitaciones
    console.log('📝 Actualizando límite de habitaciones a 6...');
    await sql`
      UPDATE tenants 
      SET max_rooms = 6, updated_at = NOW()
      WHERE id = ${tenantId}
    `;
    
    // 2. Obtener el lodging_id del tenant
    const tenantResult = await sql`
      SELECT lodging_id, name FROM tenants WHERE id = ${tenantId}
    `;
    
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tenant no encontrado'
      }, { status: 404 });
    }
    
    const lodgingId = tenantResult.rows[0].lodging_id;
    const tenantName = tenantResult.rows[0].name;
    console.log('🏠 Lodging ID:', lodgingId);
    
    // 3. Crear las 6 habitaciones si no existen
    const rooms = [
      { id: '1', name: 'Habitación 1' },
      { id: '2', name: 'Habitación 2' },
      { id: '3', name: 'Habitación 3' },
      { id: '4', name: 'Habitación 4' },
      { id: '5', name: 'Habitación 5' },
      { id: '6', name: 'Habitación 6' }
    ];
    
    console.log('🏠 Creando/actualizando habitaciones...');
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
    
    // 4. Verificar que todo esté correcto
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
    console.log(`📊 Habitaciones creadas: ${finalCheck.rows[0].total_rooms}`);
    
    return NextResponse.json({
      success: true,
      message: 'Hostal configurado correctamente con 6 habitaciones',
      tenant: {
        name: tenantCheck.rows[0].name,
        max_rooms: tenantCheck.rows[0].max_rooms
      },
      rooms: {
        total: finalCheck.rows[0].total_rooms,
        details: createdRooms
      }
    });
    
  } catch (error) {
    console.error('❌ Error configurando el hostal:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error configurando el hostal',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
