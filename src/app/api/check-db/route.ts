import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando estado de la base de datos...');
    
    // Verificar si la tabla existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'guest_registrations'
      );
    `;
    
    const exists = tableExists.rows[0]?.exists;
    
    if (!exists) {
      return NextResponse.json({ 
        status: 'error',
        message: 'Tabla guest_registrations no existe',
        tableExists: false
      });
    }
    
    // Verificar estructura de la tabla
    const tableStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'guest_registrations'
      ORDER BY ordinal_position;
    `;
    
    // Contar registros existentes
    const count = await sql`
      SELECT COUNT(*) as total FROM guest_registrations;
    `;
    
    console.log('✅ Tabla guest_registrations existe y es accesible');
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'Base de datos funcionando correctamente',
      tableExists: true,
      structure: tableStructure.rows,
      totalRecords: parseInt(count.rows[0]?.total || '0')
    });
    
  } catch (error) {
    console.error('❌ Error verificando base de datos:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Error accediendo a la base de datos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
