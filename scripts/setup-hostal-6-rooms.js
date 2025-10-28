/**
 * 🏨 SCRIPT PARA CONFIGURAR TU HOSTAL CON 6 HABITACIONES
 * 
 * Este script configura tu tenant para que tenga 6 habitaciones
 * según tu contrato con Delfín Check-in
 */

const { sql } = require('@vercel/postgres');

async function setupHostal6Rooms() {
  try {
    console.log('🏨 Configurando tu hostal con 6 habitaciones...');
    
    // ID de tu tenant (reemplaza con tu ID real)
    const tenantId = '870e589f-d313-4a5a-901f-f25fd4e7240a';
    
    // 1. Actualizar el tenant para que tenga límite de 6 habitaciones
    console.log('📝 Actualizando límite de habitaciones a 6...');
    await sql`
      UPDATE tenants 
      SET max_rooms = 6, updated_at = NOW()
      WHERE id = ${tenantId}
    `;
    
    // 2. Obtener el lodging_id del tenant
    const tenantResult = await sql`
      SELECT lodging_id FROM tenants WHERE id = ${tenantId}
    `;
    
    if (tenantResult.rows.length === 0) {
      throw new Error('Tenant no encontrado');
    }
    
    const lodgingId = tenantResult.rows[0].lodging_id;
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
      } else {
        // Crear nueva habitación
        await sql`
          INSERT INTO "Room" (id, name, "lodgingId", created_at, updated_at)
          VALUES (${room.id}, ${room.name}, ${lodgingId}, NOW(), NOW())
        `;
        console.log(`✅ Creada: ${room.name}`);
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
    
    console.log('\n🎉 ¡Configuración completada!');
    console.log(`📊 Tenant: ${tenantCheck.rows[0].name}`);
    console.log(`📊 Límite de habitaciones: ${tenantCheck.rows[0].max_rooms}`);
    console.log(`📊 Habitaciones creadas: ${finalCheck.rows[0].total_rooms}`);
    
    if (finalCheck.rows[0].total_rooms == 6) {
      console.log('✅ ¡Perfecto! Tu hostal está configurado con 6 habitaciones.');
    } else {
      console.log('⚠️ Algo no salió como esperado. Revisa la configuración.');
    }
    
  } catch (error) {
    console.error('❌ Error configurando el hostal:', error);
  }
}

// Ejecutar el script
setupHostal6Rooms();
