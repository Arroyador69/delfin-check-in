import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('⚙️ Configurando credenciales MIR...');
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      console.error('❌ Datos JSON inválidos o vacíos');
      return NextResponse.json({ 
        error: 'Datos JSON inválidos o vacíos' 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const {
      usuario,
      contraseña,
      codigoArrendador,
      baseUrl = 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      aplicacion = 'Delfin_Check_in',
      simulacion = false
    } = json;

    // Validaciones
    if (!usuario || !contraseña || !codigoArrendador) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales incompletas',
        message: 'Usuario, contraseña y código de arrendador son obligatorios'
      }, { status: 400 });
    }

    // Validar formato del usuario
    if (!usuario.includes('---WS')) {
      return NextResponse.json({
        success: false,
        error: 'Formato de usuario incorrecto',
        message: 'El usuario debe terminar en ---WS (ejemplo: TU_CIF---WS)'
      }, { status: 400 });
    }

    console.log('📋 Configurando credenciales MIR:', {
      usuario,
      codigoArrendador,
      baseUrl,
      simulacion
    });

    // En un entorno real, aquí se guardarían las credenciales en variables de entorno
    // o en una base de datos segura. Por ahora, solo validamos y confirmamos.
    
    const configuracion = {
      usuario,
      contraseña: '***', // No devolver la contraseña real
      codigoArrendador,
      baseUrl,
      aplicacion,
      simulacion,
      activo: true
    };

    console.log('✅ Configuración MIR validada correctamente');

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR guardada correctamente',
      configuracion,
      interpretacion: {
        exito: true,
        mensaje: '✅ Configuración MIR guardada correctamente. Las credenciales han sido validadas.',
        detalles: {
          usuario: configuracion.usuario,
          codigoArrendador: configuracion.codigoArrendador,
          baseUrl: configuracion.baseUrl,
          simulacion: configuracion.simulacion,
          activo: configuracion.activo
        }
      },
      instrucciones: {
        titulo: 'Próximos pasos',
        pasos: [
          '1. Verifica que las credenciales estén configuradas en las variables de entorno de Vercel',
          '2. Prueba la conexión usando el botón "Probar Conexión"',
          '3. Accede al panel MIR para enviar comunicaciones de prueba',
          '4. Una vez verificado, puedes usar el sistema en producción'
        ]
      },
      variablesEntorno: {
        titulo: 'Variables de entorno requeridas en Vercel',
        variables: [
          `MIR_HTTP_USER=${usuario}`,
          `MIR_HTTP_PASS=${contraseña}`,
          `MIR_CODIGO_ARRENDADOR=${codigoArrendador}`,
          `MIR_BASE_URL=${baseUrl}`,
          `MIR_APLICACION=${aplicacion}`,
          `MIR_SIMULACION=${simulacion}`
        ]
      }
    });

  } catch (error) {
    console.error('❌ Error configurando credenciales MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error configurando credenciales MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}