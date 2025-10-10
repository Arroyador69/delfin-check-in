import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 DEBUG: Verificando habitaciones...');
    
    // Obtener tenant_id del header
    const tenantId = req.headers.get('x-tenant-id');
    console.log('🔍 DEBUG: tenant_id recibido:', tenantId);
    
    // Verificar si la tabla Room existe
    try {
      const roomCheck = await sql`SELECT 1 FROM "Room" LIMIT 1`;
      console.log('✅ Tabla Room existe');
    } catch (error) {
      console.log('❌ Tabla Room no existe:', error);
      return NextResponse.json({ 
        error: 'Tabla Room no existe',
        details: error.message 
      }, { status: 500 });
    }
    
    // Obtener todas las habitaciones sin filtro
    const allRooms = await sql`SELECT * FROM "Room" LIMIT 10`;
    console.log('🔍 DEBUG: Todas las habitaciones:', allRooms.rows);
    
    // Obtener habitaciones filtradas por tenant_id
    const filteredRooms = await sql`
      SELECT * FROM "Room" 
      WHERE "lodgingId" = ${tenantId}
      ORDER BY "created_at" DESC
    `;
    console.log('🔍 DEBUG: Habitaciones filtradas:', filteredRooms.rows);
    
    // Verificar si existe la tabla tenants
    try {
      const tenantCheck = await sql`SELECT * FROM tenants WHERE id = ${tenantId}`;
      console.log('🔍 DEBUG: Tenant encontrado:', tenantCheck.rows);
    } catch (error) {
      console.log('❌ Error verificando tenant:', error);
    }
    
    return NextResponse.json({
      tenantId,
      allRooms: allRooms.rows,
      filteredRooms: filteredRooms.rows,
      totalRooms: allRooms.rows.length,
      filteredCount: filteredRooms.rows.length
    });
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
    return NextResponse.json({ 
      error: 'Error en debug',
      details: error.message 
    }, { status: 500 });
  }
}
