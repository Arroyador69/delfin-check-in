import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Test de conexión MIR...');

    // Verificar variables de entorno
    const config = {
      baseUrl: process.env.MIR_BASE_URL,
      username: process.env.MIR_HTTP_USER,
      password: process.env.MIR_HTTP_PASS,
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR,
      aplicacion: process.env.MIR_APLICACION,
      simulacion: process.env.MIR_SIMULACION
    };

    console.log('🔧 Variables de entorno MIR:', {
      baseUrl: config.baseUrl ? 'CONFIGURADO' : 'NO_CONFIGURADO',
      username: config.username ? 'CONFIGURADO' : 'NO_CONFIGURADO',
      password: config.password ? 'CONFIGURADO' : 'NO_CONFIGURADO',
      codigoArrendador: config.codigoArrendador ? 'CONFIGURADO' : 'NO_CONFIGURADO',
      aplicacion: config.aplicacion || 'NO_CONFIGURADO',
      simulacion: config.simulacion || 'NO_CONFIGURADO'
    });

    // Verificar conexión a base de datos
    const dbTest = await sql`SELECT COUNT(*) as total FROM mir_comunicaciones`;
    console.log('📊 Test BD:', dbTest.rows[0]);

    // Verificar lotes disponibles
    const lotesTest = await sql`
      SELECT 
        lote,
        estado,
        COUNT(*) as count
      FROM mir_comunicaciones 
      WHERE lote IS NOT NULL AND lote != ''
      GROUP BY lote, estado
      ORDER BY lote DESC
      LIMIT 5
    `;

    console.log('📋 Lotes disponibles:', lotesTest.rows);

    return NextResponse.json({
      success: true,
      message: 'Test de conexión completado',
      config: {
        baseUrl: config.baseUrl ? 'CONFIGURADO' : 'NO_CONFIGURADO',
        username: config.username ? 'CONFIGURADO' : 'NO_CONFIGURADO',
        password: config.password ? 'CONFIGURADO' : 'NO_CONFIGURADO',
        codigoArrendador: config.codigoArrendador ? 'CONFIGURADO' : 'NO_CONFIGURADO',
        aplicacion: config.aplicacion || 'NO_CONFIGURADO',
        simulacion: config.simulacion || 'NO_CONFIGURADO'
      },
      database: {
        totalComunicaciones: dbTest.rows[0]?.total || 0,
        lotesDisponibles: lotesTest.rows.length,
        lotes: lotesTest.rows
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en test de conexión:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en test de conexión',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
