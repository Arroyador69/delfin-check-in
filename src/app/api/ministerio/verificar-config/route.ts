import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando configuración MIR...');

    // Verificar variables de entorno
    const config = {
      usuario: process.env.MIR_HTTP_USER || '',
      contraseña: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
      simulacion: process.env.MIR_SIMULACION === 'true',
      activo: true
    };

    // Verificar si las credenciales están configuradas
    const hasRequiredVars = !!(
      config.usuario &&
      config.contraseña &&
      config.codigoArrendador
    );

    const status = {
      configurado: hasRequiredVars,
      credenciales: {
        usuario: !!config.usuario,
        contraseña: !!config.contraseña,
        codigoArrendador: !!config.codigoArrendador
      },
      configuracion: {
        baseUrl: config.baseUrl,
        aplicacion: config.aplicacion,
        simulacion: config.simulacion,
        activo: config.activo
      }
    };

    console.log('📋 Estado de configuración MIR:', status);

    return NextResponse.json({
      success: true,
      message: hasRequiredVars ? 
        'Configuración MIR completa' : 
        'Configuración MIR incompleta - faltan credenciales',
      config: {
        usuario: config.usuario,
        contraseña: config.contraseña ? '***' : '', // No mostrar la contraseña real
        codigoArrendador: config.codigoArrendador,
        baseUrl: config.baseUrl,
        aplicacion: config.aplicacion,
        simulacion: config.simulacion,
        activo: config.activo
      },
      status,
      interpretacion: {
        configurado: hasRequiredVars,
        mensaje: hasRequiredVars ? 
          '✅ Configuración MIR completa y lista para usar' : 
          '❌ Configuración MIR incompleta - configura las credenciales en las variables de entorno',
        credencialesFaltantes: [
          !config.usuario && 'Usuario MIR (MIR_HTTP_USER)',
          !config.contraseña && 'Contraseña MIR (MIR_HTTP_PASS)',
          !config.codigoArrendador && 'Código Arrendador (MIR_CODIGO_ARRENDADOR)'
        ].filter(Boolean)
      }
    });

  } catch (error) {
    console.error('❌ Error verificando configuración MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error verificando configuración MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}