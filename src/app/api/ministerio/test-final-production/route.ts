import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientFixed, getMinisterioConfigFromEnv } from '@/lib/ministerio-client-fixed';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Test final de producción MIR con credenciales corregidas...');
    
    // Obtener configuración desde variables de entorno
    const config = getMinisterioConfigFromEnv();
    
    console.log('📋 Configuración MIR:', {
      baseUrl: config.baseUrl,
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      aplicacion: config.aplicacion,
      simulacion: config.simulacion
    });

    // Verificar que tenemos todas las credenciales necesarias
    if (config.simulacion) {
      console.log('⚠️ Modo simulación activado - no se realizará conexión real');
      return NextResponse.json({
        success: true,
        mode: 'simulation',
        message: 'Modo simulación activado. Las credenciales reales no están configuradas.',
        config: {
          baseUrl: config.baseUrl,
          username: config.username,
          codigoArrendador: config.codigoArrendador,
          aplicacion: config.aplicacion
        }
      });
    }

    // Crear cliente MIR
    const client = new MinisterioClientFixed(config);

    // XML de prueba para un viajero
    const xmlAlta = `<?xml version="1.0" encoding="UTF-8"?>
<solicitud>
  <codigoEstablecimiento>0000256653</codigoEstablecimiento>
  <codigoArrendador>${config.codigoArrendador}</codigoArrendador>
  <aplicacion>${config.aplicacion}</aplicacion>
  <tipoOperacion>A</tipoOperacion>
  <tipoComunicacion>PV</tipoComunicacion>
  <datosViajero>
    <nombre>TEST</nombre>
    <apellidos>PRODUCCION</apellidos>
    <fechaNacimiento>1990-01-01</fechaNacimiento>
    <nacionalidad>ES</nacionalidad>
    <tipoDocumento>NIF</tipoDocumento>
    <numeroDocumento>12345678Z</numeroDocumento>
    <fechaEntrada>${new Date().toISOString().split('T')[0]}</fechaEntrada>
    <fechaSalida>${new Date().toISOString().split('T')[0]}</fechaSalida>
    <numeroHabitacion>101</numeroHabitacion>
    <observaciones>Test de producción con credenciales corregidas</observaciones>
  </datosViajero>
</solicitud>`;

    console.log('📤 Enviando comunicación de prueba al MIR...');
    
    // Intentar enviar la comunicación
    const resultado = await client.altaPV({ xmlAlta });

    console.log('📊 Resultado del envío:', {
      ok: resultado.ok,
      codigo: resultado.codigo,
      descripcion: resultado.descripcion,
      lote: resultado.lote,
      codigoComunicacion: resultado.codigoComunicacion
    });

    // Determinar el estado del resultado
    let status = 'unknown';
    let message = '';
    
    if (resultado.ok) {
      status = 'success';
      message = '✅ Comunicación enviada exitosamente al MIR';
    } else if (resultado.codigo === 'TIMEOUT') {
      status = 'timeout';
      message = '⏱️ Timeout en la conexión con el MIR';
    } else if (resultado.codigo === 'NETWORK_ERROR') {
      status = 'network_error';
      message = '🌐 Error de conectividad con el MIR';
    } else if (resultado.codigo === '401' || resultado.codigo === '403') {
      status = 'auth_error';
      message = '🔐 Error de autenticación. Verificar credenciales.';
    } else {
      status = 'error';
      message = `❌ Error del MIR: ${resultado.descripcion}`;
    }

    return NextResponse.json({
      success: resultado.ok,
      status,
      message,
      resultado: {
        ok: resultado.ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion,
        lote: resultado.lote,
        codigoComunicacion: resultado.codigoComunicacion
      },
      config: {
        baseUrl: config.baseUrl,
        username: config.username,
        codigoArrendador: config.codigoArrendador,
        aplicacion: config.aplicacion
      },
      rawResponse: resultado.rawResponse.substring(0, 1000),
      timestamp: new Date().toISOString(),
      nextSteps: resultado.ok 
        ? [
            '✅ Sistema MIR funcionando correctamente',
            '🚀 Listo para usar en producción',
            '📝 Configurar envío automático de comunicaciones'
          ]
        : [
            '🔍 Revisar las credenciales MIR',
            '📞 Contactar al soporte del MIR si es necesario',
            '🧪 Probar desde un entorno diferente',
            '📋 Verificar la configuración de red'
          ]
    });

  } catch (error) {
    console.error('❌ Error en test final de producción:', error);
    
    return NextResponse.json({
      success: false,
      status: 'error',
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString(),
      nextSteps: [
        '🔍 Revisar los logs del servidor',
        '🧪 Probar con el endpoint de verificación de credenciales',
        '📞 Contactar al soporte técnico si persiste el problema'
      ]
    }, { status: 500 });
  }
}
