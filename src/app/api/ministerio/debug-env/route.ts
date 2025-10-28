import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint temporal para debuggear las variables de entorno
 * NO usar en producción - solo para debugging
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Debug de variables de entorno MIR...');
    
    // Verificar que las variables de entorno estén configuradas
    const envVars = {
      MIR_BASE_URL: process.env.MIR_BASE_URL,
      MIR_HTTP_USER: process.env.MIR_HTTP_USER,
      MIR_HTTP_PASS: process.env.MIR_HTTP_PASS,
      MIR_CODIGO_ARRENDADOR: process.env.MIR_CODIGO_ARRENDADOR,
      MIR_APLICACION: process.env.MIR_APLICACION,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL
    };

    console.log('📋 Variables detectadas:');
    Object.entries(envVars).forEach(([key, value]) => {
      if (key.includes('PASS')) {
        console.log(`  ${key}: ${value ? '***' : '❌ NO CONFIGURADA'}`);
      } else {
        console.log(`  ${key}: ${value || '❌ NO CONFIGURADA'}`);
      }
    });

    // Verificar que todas las variables estén configuradas
    const missingVars = Object.entries(envVars)
      .filter(([key, value]) => !value && !['NODE_ENV', 'VERCEL'].includes(key))
      .map(([key]) => key);

    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      variables: {
        ...envVars,
        // No mostrar contraseña en la respuesta
        MIR_HTTP_PASS: envVars.MIR_HTTP_PASS ? '***' : null
      },
      missingVars,
      allConfigured: missingVars.length === 0
    });

  } catch (error) {
    console.error('❌ Error en debug de variables:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo variables de entorno',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
