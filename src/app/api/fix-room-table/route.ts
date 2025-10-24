import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * 🔧 API para arreglar la tabla Room agregando columnas que faltan
 * 
 * Esta API agrega las columnas que faltan en la tabla Room
 * para que funcione correctamente con el sistema
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Arreglando tabla Room...');
    
    // 1. Verificar si la tabla Room existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Room'
      );
    `;
    
    if (!tableExists.rows[0].exists) {
      console.log('📝 Creando tabla Room...');
      await sql`
        CREATE TABLE "Room" (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          "lodgingId" UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      console.log('✅ Tabla Room creada');
    } else {
      console.log('📝 Tabla Room ya existe, verificando columnas...');
      
      // 2. Verificar si la columna updated_at existe
      const columnExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'Room' 
          AND column_name = 'updated_at'
        );
      `;
      
      if (!columnExists.rows[0].exists) {
        console.log('📝 Agregando columna updated_at...');
        await sql`
          ALTER TABLE "Room" 
          ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `;
        console.log('✅ Columna updated_at agregada');
      } else {
        console.log('✅ Columna updated_at ya existe');
      }
      
      // 3. Verificar si la columna created_at existe
      const createdColumnExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'Room' 
          AND column_name = 'created_at'
        );
      `;
      
      if (!createdColumnExists.rows[0].exists) {
        console.log('📝 Agregando columna created_at...');
        await sql`
          ALTER TABLE "Room" 
          ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `;
        console.log('✅ Columna created_at agregada');
      } else {
        console.log('✅ Columna created_at ya existe');
      }
    }
    
    // 4. Verificar la estructura final de la tabla
    const tableStructure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Room'
      ORDER BY ordinal_position;
    `;
    
    console.log('📊 Estructura de la tabla Room:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // 5. Verificar que hay habitaciones en la tabla
    const roomCount = await sql`
      SELECT COUNT(*) as total FROM "Room";
    `;
    
    console.log(`📊 Total de habitaciones en la tabla: ${roomCount.rows[0].total}`);
    
    return NextResponse.json({
      success: true,
      message: 'Tabla Room arreglada correctamente',
      tableStructure: tableStructure.rows,
      roomCount: roomCount.rows[0].total,
      instructions: [
        '1. La tabla Room ahora tiene todas las columnas necesarias',
        '2. Intenta guardar las habitaciones nuevamente',
        '3. Debería funcionar sin errores ahora'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error arreglando tabla Room:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error arreglando tabla Room',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
