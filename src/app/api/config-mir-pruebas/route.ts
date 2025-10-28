import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Configurando MIR para usar entorno de PRUEBAS temporalmente...');
    
    // Configuración temporal para PRUEBAS
    const configPruebas = {
      MIR_BASE_URL: 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      MIR_HTTP_USER: process.env.MIR_HTTP_USER || '',
      MIR_HTTP_PASS: process.env.MIR_HTTP_PASS || '',
      MIR_CODIGO_ARRENDADOR: process.env.MIR_CODIGO_ARRENDADOR || '',
      MIR_APLICACION: 'Delfin_Check_in',
      MIR_SIMULACION: 'false' // Envío real a pruebas
    };

    console.log('📋 Configuración PRUEBAS:', {
      MIR_BASE_URL: configPruebas.MIR_BASE_URL,
      MIR_HTTP_USER: configPruebas.MIR_HTTP_USER ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_HTTP_PASS: configPruebas.MIR_HTTP_PASS ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_CODIGO_ARRENDADOR: configPruebas.MIR_CODIGO_ARRENDADOR,
      MIR_APLICACION: configPruebas.MIR_APLICACION,
      MIR_SIMULACION: configPruebas.MIR_SIMULACION
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR para PRUEBAS preparada',
      configuracion: configPruebas,
      instrucciones: {
        paso1: 'Configurar estas variables de entorno en Vercel',
        paso2: 'Probar envío de registro en entorno de pruebas',
        paso3: 'Contactar soporte MIR para resolver problema de producción',
        paso4: 'Una vez resuelto, cambiar URL a producción'
      },
      variablesEntorno: {
        descripcion: 'Variables para configurar en Vercel (temporalmente):',
        variables: [
          'MIR_BASE_URL=https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
          `MIR_HTTP_USER=${configPruebas.MIR_HTTP_USER}`,
          `MIR_HTTP_PASS=${configPruebas.MIR_HTTP_PASS}`,
          `MIR_CODIGO_ARRENDADOR=${configPruebas.MIR_CODIGO_ARRENDADOR}`,
          'MIR_APLICACION=Delfin_Check_in',
          'MIR_SIMULACION=false'
        ]
      },
      diagnostico: {
        problemaProduccion: 'Endpoint devuelve 404 Not Found',
        problemaPruebas: 'Endpoint devuelve 502 Proxy Error (más prometedor)',
        recomendacion: 'Usar pruebas temporalmente hasta resolver problema de producción',
        siguientePaso: 'Contactar soporte MIR para obtener URL correcta de producción'
      }
    });

  } catch (error) {
    console.error('❌ Error configurando MIR para pruebas:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error configurando MIR para pruebas',
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
    
    const configActual = {
      MIR_BASE_URL: process.env.MIR_BASE_URL || 'NO CONFIGURADO',
      MIR_HTTP_USER: process.env.MIR_HTTP_USER ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_HTTP_PASS: process.env.MIR_HTTP_PASS ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_CODIGO_ARRENDADOR: process.env.MIR_CODIGO_ARRENDADOR || 'NO CONFIGURADO',
      MIR_APLICACION: process.env.MIR_APLICACION || 'Delfin_Check_in',
      MIR_SIMULACION: process.env.MIR_SIMULACION || 'false'
    };
    
    const esProduccion = configActual.MIR_BASE_URL.includes('hospedajes.ses.mir.es');
    const esPruebas = configActual.MIR_BASE_URL.includes('hospedajes.pre-ses.mir.es');
    
    return NextResponse.json({
      success: true,
      configuracionActual: configActual,
      analisis: {
        entorno: esProduccion ? 'PRODUCCIÓN' : esPruebas ? 'PRUEBAS' : 'NO CONFIGURADO',
        estado: esProduccion ? '❌ Problema: 404 Not Found' : 
                esPruebas ? '⚠️ Problema: 502 Proxy Error (mejor que 404)' : 
                '❌ No configurado',
        recomendacion: esProduccion ? 
          'Cambiar temporalmente a PRUEBAS hasta resolver problema de producción' :
          esPruebas ? 
          'Probar envíos en PRUEBAS y contactar soporte MIR' :
          'Configurar entorno de PRUEBAS'
      },
      proximosPasos: [
        '1. Configurar MIR_BASE_URL para PRUEBAS temporalmente',
        '2. Probar envío de registro en PRUEBAS',
        '3. Contactar soporte MIR para resolver producción',
        '4. Una vez resuelto, volver a producción'
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





