import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Configurando MIR para PRODUCCIÓN...');
    
    const json = await req.json().catch(() => ({}));
    
    // Validar que recibimos las credenciales necesarias
    const { username, password, codigoArrendador, confirmar } = json;
    
    if (!confirmar) {
      return NextResponse.json({
        success: false,
        error: 'Confirmación requerida',
        message: 'Debe enviar confirmar: true para activar producción'
      }, { status: 400 });
    }
    
    if (!username || !password || !codigoArrendador) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales incompletas',
        message: 'Faltan username, password o codigoArrendador',
        requeridos: ['username', 'password', 'codigoArrendador', 'confirmar']
      }, { status: 400 });
    }
    
    // Configuración de producción
    const configProduccion = {
      MIR_BASE_URL: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      MIR_HTTP_USER: username,
      MIR_HTTP_PASS: password,
      MIR_CODIGO_ARRENDADOR: codigoArrendador,
      MIR_APLICACION: 'Delfin_Check_in',
      MIR_SIMULACION: 'false'
    };
    
    console.log('✅ Configuración PRODUCCIÓN validada:', {
      MIR_BASE_URL: configProduccion.MIR_BASE_URL,
      MIR_HTTP_USER: '***CONFIGURADO***',
      MIR_HTTP_PASS: '***CONFIGURADO***',
      MIR_CODIGO_ARRENDADOR: configProduccion.MIR_CODIGO_ARRENDADOR,
      MIR_APLICACION: configProduccion.MIR_APLICACION,
      MIR_SIMULACION: configProduccion.MIR_SIMULACION
    });
    
    return NextResponse.json({
      success: true,
      message: 'Configuración MIR PRODUCCIÓN validada correctamente',
      configuracion: {
        MIR_BASE_URL: configProduccion.MIR_BASE_URL,
        MIR_HTTP_USER: '***CONFIGURADO***',
        MIR_HTTP_PASS: '***CONFIGURADO***',
        MIR_CODIGO_ARRENDADOR: configProduccion.MIR_CODIGO_ARRENDADOR,
        MIR_APLICACION: configProduccion.MIR_APLICACION,
        MIR_SIMULACION: configProduccion.MIR_SIMULACION
      },
      instrucciones: {
        paso1: 'Configurar estas variables de entorno en Vercel',
        paso2: 'Probar conexión con /api/ministerio/test-produccion',
        paso3: 'Activar auto-envío en formularios públicos',
        paso4: 'Monitorear envíos en /estado-envios-mir'
      },
      variablesEntorno: {
        descripcion: 'Variables que debe configurar en Vercel:',
        variables: [
          'MIR_BASE_URL=https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
          `MIR_HTTP_USER=${username}`,
          `MIR_HTTP_PASS=${password}`,
          `MIR_CODIGO_ARRENDADOR=${codigoArrendador}`,
          'MIR_APLICACION=Delfin_Check_in',
          'MIR_SIMULACION=false'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Error configurando MIR PRODUCCIÓN:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error configurando MIR PRODUCCIÓN',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Consultando configuración MIR actual...');
    
    // Verificar configuración actual
    const configActual = {
      MIR_BASE_URL: process.env.MIR_BASE_URL || 'NO CONFIGURADO',
      MIR_HTTP_USER: process.env.MIR_HTTP_USER ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_HTTP_PASS: process.env.MIR_HTTP_PASS ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_CODIGO_ARRENDADOR: process.env.MIR_CODIGO_ARRENDADOR || 'NO CONFIGURADO',
      MIR_APLICACION: process.env.MIR_APLICACION || 'Delfin_Check_in',
      MIR_SIMULACION: process.env.MIR_SIMULACION || 'false'
    };
    
    // Determinar entorno actual
    const esProduccion = configActual.MIR_BASE_URL.includes('hospedajes.ses.mir.es');
    const esPruebas = configActual.MIR_BASE_URL.includes('hospedajes.pre-ses.mir.es');
    const modoSimulacion = configActual.MIR_SIMULACION === 'true';
    
    // Análisis de configuración
    const analisis = {
      entorno: esProduccion ? 'PRODUCCIÓN' : esPruebas ? 'PRUEBAS' : 'NO CONFIGURADO',
      modoSimulacion,
      credencialesConfiguradas: !!(
        process.env.MIR_HTTP_USER && 
        process.env.MIR_HTTP_PASS && 
        process.env.MIR_CODIGO_ARRENDADOR
      ),
      urlValida: configActual.MIR_BASE_URL.includes('mir.es'),
      listoParaProduccion: esProduccion && !modoSimulacion && !!(
        process.env.MIR_HTTP_USER && 
        process.env.MIR_HTTP_PASS && 
        process.env.MIR_CODIGO_ARRENDADOR
      )
    };
    
    return NextResponse.json({
      success: true,
      configuracionActual: configActual,
      analisis,
      recomendaciones: [
        analisis.listoParaProduccion ? 
          '✅ Sistema listo para envíos reales al MIR' :
          '⚠️ Configurar credenciales y cambiar a URL de producción',
        modoSimulacion ? 
          '⚠️ Sistema en modo simulación - no se envían datos reales' :
          '✅ Sistema configurado para envíos reales',
        !analisis.credencialesConfiguradas ? 
          '⚠️ Faltan credenciales del MIR' :
          '✅ Credenciales configuradas'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error consultando configuración MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error consultando configuración MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
