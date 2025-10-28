import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando configuración MIR en producción...');
    
    // Verificar variables de entorno del MIR
    const config = {
      MIR_BASE_URL: process.env.MIR_BASE_URL || 'NO CONFIGURADO',
      MIR_HTTP_USER: process.env.MIR_HTTP_USER ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_HTTP_PASS: process.env.MIR_HTTP_PASS ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_CODIGO_ARRENDADOR: process.env.MIR_CODIGO_ARRENDADOR || 'NO CONFIGURADO',
      MIR_APLICACION: process.env.MIR_APLICACION || 'Delfin_Check_in',
      MIR_SIMULACION: process.env.MIR_SIMULACION || 'false'
    };
    
    // Verificar si las credenciales están configuradas
    const credencialesConfiguradas = !!(
      process.env.MIR_HTTP_USER && 
      process.env.MIR_HTTP_PASS && 
      process.env.MIR_CODIGO_ARRENDADOR
    );
    
    // Verificar URL base
    const urlValida = config.MIR_BASE_URL.includes('mir.es');
    const esProduccion = config.MIR_BASE_URL.includes('hospedajes.ses.mir.es');
    const esPruebas = config.MIR_BASE_URL.includes('hospedajes.pre-ses.mir.es');
    
    // Verificar si está en modo simulación
    const modoSimulacion = config.MIR_SIMULACION === 'true';
    
    // Análisis de la configuración
    const analisis = {
      configuracionCompleta: credencialesConfiguradas && urlValida,
      credencialesConfiguradas,
      urlValida,
      esProduccion,
      esPruebas,
      modoSimulacion,
      entorno: esProduccion ? 'PRODUCCIÓN' : esPruebas ? 'PRUEBAS' : 'NO CONFIGURADO',
      listoParaProduccion: esProduccion && !modoSimulacion && credencialesConfiguradas,
      problemas: []
    };
    
    if (!credencialesConfiguradas) {
      analisis.problemas.push('Faltan credenciales del MIR (MIR_HTTP_USER, MIR_HTTP_PASS, MIR_CODIGO_ARRENDADOR)');
    }
    
    if (!urlValida) {
      analisis.problemas.push('URL del MIR no válida o no configurada');
    }
    
    if (!esProduccion && !esPruebas) {
      analisis.problemas.push('URL no es ni de producción ni de pruebas del MIR');
    }
    
    if (modoSimulacion) {
      analisis.problemas.push('Sistema en modo simulación - no se envían datos reales al MIR');
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      entorno: 'PRODUCCIÓN ONLINE',
      configuracion: config,
      analisis,
      estado: analisis.listoParaProduccion ? 'LISTO PARA PRODUCCIÓN' : 'REQUIERE CONFIGURACIÓN',
      recomendaciones: [
        analisis.listoParaProduccion ? 
          '✅ Sistema listo para envíos reales al MIR' :
          '⚠️ Configurar credenciales y cambiar a URL de producción',
        modoSimulacion ? 
          '⚠️ Sistema en modo simulación - no se envían datos reales' :
          '✅ Sistema configurado para envíos reales',
        !analisis.credencialesConfiguradas ? 
          '⚠️ Faltan credenciales del MIR' :
          '✅ Credenciales configuradas',
        !esProduccion ? 
          '⚠️ URL no es de producción del MIR' :
          '✅ URL de producción configurada'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error verificando configuración MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error verificando configuración',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}




