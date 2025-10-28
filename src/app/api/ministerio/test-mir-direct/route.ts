import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Test de configuración MIR...');

    const config = {
      baseUrl: process.env.MIR_BASE_URL,
      username: process.env.MIR_HTTP_USER,
      password: process.env.MIR_HTTP_PASS,
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR,
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in'
    };

    console.log('🔧 Configuración MIR:', {
      baseUrl: config.baseUrl || 'NO_CONFIGURADO',
      username: config.username ? 'CONFIGURADO' : 'NO_CONFIGURADO',
      codigoArrendador: config.codigoArrendador || 'NO_CONFIGURADO'
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR verificada',
      config: {
        baseUrl: !!config.baseUrl,
        username: !!config.username,
        password: !!config.password,
        codigoArrendador: !!config.codigoArrendador,
        aplicacion: config.aplicacion
      }
    });

  } catch (error) {
    console.error('❌ Error en test de configuración:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en test de configuración',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
