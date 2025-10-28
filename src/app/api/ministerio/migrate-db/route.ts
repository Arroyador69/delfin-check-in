import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Iniciando migración de base de datos MIR...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(process.cwd(), 'database', 'mir-comunicaciones.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Contenido SQL leído:', sqlContent.length, 'caracteres');
    
    // Ejecutar la migración
    await sql.unsafe(sqlContent);
    
    console.log('✅ Migración completada exitosamente');
    
    return NextResponse.json({
      success: true,
      message: 'Migración de base de datos MIR completada',
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en migración de base de datos:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en migración de base de datos',
      message: error instanceof Error ? error.message : 'Error desconocido',
      details: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
