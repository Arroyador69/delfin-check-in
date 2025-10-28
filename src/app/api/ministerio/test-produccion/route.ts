import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Probando conexión MIR...');
    
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

    console.log('📋 Probando conexión con credenciales:', {
      usuario,
      codigoArrendador,
      baseUrl,
      simulacion
    });

    // Configuración del MIR
    const config = {
      baseUrl,
      username: usuario,
      password: contraseña,
      codigoArrendador,
      aplicacion,
      simulacion
    };

    // Crear cliente MIR oficial
    const client = new MinisterioClientOfficial(config);
    
    // Probar conexión consultando un catálogo
    const resultado = await client.consultaCatalogo({ catalogo: 'TIPOS_DOCUMENTO' });
    
    console.log('✅ Resultado de la prueba de conexión:', resultado);

    return NextResponse.json({
      success: true,
      message: 'Prueba de conexión completada',
      resultado: {
        exito: resultado.ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion,
        elementos: resultado.elementos?.length || 0
      },
      interpretacion: {
        exito: resultado.ok,
        mensaje: resultado.ok ? 
          `✅ Conexión exitosa con el MIR. Catálogo consultado correctamente. Encontrados ${resultado.elementos?.length || 0} elementos` : 
          `❌ Error en la conexión: ${resultado.descripcion}`,
        codigo: resultado.codigo,
        detalles: {
          configuracion: {
            baseUrl: config.baseUrl,
            usuario: config.username,
            codigoArrendador: config.codigoArrendador,
            simulacion: config.simulacion
          },
          respuesta: {
            codigo: resultado.codigo,
            descripcion: resultado.descripcion,
            elementosEncontrados: resultado.elementos?.length || 0
          }
        }
      },
      debug: {
        configuracion: {
          baseUrl: config.baseUrl,
          usuario: config.username,
          codigoArrendador: config.codigoArrendador,
          simulacion: config.simulacion
        },
        respuesta: resultado
      }
    });

  } catch (error) {
    console.error('❌ Error en prueba de conexión MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en prueba de conexión MIR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      interpretacion: {
        exito: false,
        mensaje: `❌ Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        detalles: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      }
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}