import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 AUDITORÍA: Verificando configuración del MIR...');
    
    // Verificar variables de entorno del MIR
    const config = {
      MIR_BASE_URL: process.env.MIR_BASE_URL || 'NO CONFIGURADO',
      MIR_HTTP_USER: process.env.MIR_HTTP_USER ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_HTTP_PASS: process.env.MIR_HTTP_PASS ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_CODIGO_ARRENDADOR: process.env.MIR_CODIGO_ARRENDADOR || 'NO CONFIGURADO',
      MIR_APLICACION: process.env.MIR_APLICACION || 'Delfin_Check_in',
      MIR_SIMULACION: process.env.MIR_SIMULACION || 'false',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'NO CONFIGURADO'
    };
    
    // Verificar si las credenciales están configuradas
    const credencialesConfiguradas = !!(
      process.env.MIR_HTTP_USER && 
      process.env.MIR_HTTP_PASS && 
      process.env.MIR_CODIGO_ARRENDADOR
    );
    
    // Verificar URL base
    const urlValida = config.MIR_BASE_URL.includes('mir.es');
    
    // Verificar si está en modo simulación
    const modoSimulacion = config.MIR_SIMULACION === 'true';
    
    // Análisis de la configuración
    const analisis = {
      configuracionCompleta: credencialesConfiguradas && urlValida,
      credencialesConfiguradas,
      urlValida,
      modoSimulacion,
      problemas: [] as string[],
    };
    
    if (!credencialesConfiguradas) {
      analisis.problemas.push('Faltan credenciales del MIR (MIR_HTTP_USER, MIR_HTTP_PASS, MIR_CODIGO_ARRENDADOR)');
    }
    
    if (!urlValida) {
      analisis.problemas.push('URL del MIR no válida o no configurada');
    }
    
    if (modoSimulacion) {
      analisis.problemas.push('Sistema en modo simulación - no se envían datos reales al MIR');
    }
    
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      analisis.problemas.push('NEXT_PUBLIC_BASE_URL no configurada - puede afectar el auto-envío');
    }
    
    return NextResponse.json({
      success: true,
      configuracion: config,
      analisis,
      recomendaciones: [
        'Verificar que todas las variables de entorno estén configuradas en Vercel',
        'Confirmar que las credenciales del MIR sean correctas',
        'Asegurar que MIR_SIMULACION esté en false para envíos reales',
        'Verificar que la URL del MIR sea la correcta para el entorno'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error verificando configuración MIR:', error);
    return NextResponse.json({
      success: false,
      error: 'Error verificando configuración',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

