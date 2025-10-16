import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Test conexión MIR PRODUCCIÓN iniciado...');
    
    const json = await req.json().catch(() => ({}));
    
    // Configuración específica para PRODUCCIÓN usando las credenciales actuales
    const configProduccion = {
      baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in',
      simulacion: false // SIEMPRE FALSE para producción
    };

    console.log('📋 Configuración PRODUCCIÓN:', {
      baseUrl: configProduccion.baseUrl,
      username: configProduccion.username,
      codigoArrendador: configProduccion.codigoArrendador,
      aplicacion: configProduccion.aplicacion,
      simulacion: configProduccion.simulacion
    });

    // Verificar que tenemos las credenciales
    if (!configProduccion.username || !configProduccion.password || !configProduccion.codigoArrendador) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales incompletas',
        message: 'Faltan username, password o codigoArrendador en variables de entorno',
        configuracion: {
          username: configProduccion.username ? '***CONFIGURADO***' : 'NO CONFIGURADO',
          password: configProduccion.password ? '***CONFIGURADO***' : 'NO CONFIGURADO',
          codigoArrendador: configProduccion.codigoArrendador || 'NO CONFIGURADO'
        }
      }, { status: 400 });
    }

    // Datos de prueba mínimos pero válidos
    const testData = {
      codigoEstablecimiento: configProduccion.codigoArrendador,
      comunicaciones: [{
        contrato: {
          referencia: `TEST-PROD-${Date.now()}`,
          fechaContrato: new Date().toISOString().split('T')[0],
          fechaEntrada: new Date().toISOString(),
          fechaSalida: new Date(Date.now() + 24*60*60*1000).toISOString(),
          numPersonas: 1,
          numHabitaciones: 1,
          internet: false,
          pago: {
            tipoPago: "EFECT",
            fechaPago: new Date().toISOString().split('T')[0]
          }
        },
        personas: [{
          rol: "VI",
          nombre: "Test",
          apellido1: "Produccion",
          apellido2: "MIR",
          tipoDocumento: "NIF",
          numeroDocumento: "12345678Z",
          soporteDocumento: "C",
          fechaNacimiento: "1985-01-01",
          nacionalidad: "ESP",
          sexo: "M",
          telefono: "600000000",
          correo: "test@delfincheckin.com",
          direccion: {
            direccion: "Calle Test 123",
            codigoPostal: "28001",
            pais: "ESP",
            codigoMunicipio: "28079"
          }
        }]
      }]
    };
    
    console.log('📤 Enviando test a MIR PRODUCCIÓN...');
    
    // Importar y usar el cliente MIR
    const { MinisterioClientVercel } = await import('@/lib/ministerio-client-vercel');
    const client = new MinisterioClientVercel(configProduccion);
    
    // Generar XML para el test
    const { create } = await import('xmlbuilder2');
    
    const root = {
      solicitud: {
        codigoEstablecimiento: testData.codigoEstablecimiento,
        comunicacion: testData.comunicaciones.map((c) => ({
          contrato: {
            referencia: c.contrato.referencia,
            fechaContrato: c.contrato.fechaContrato,
            fechaEntrada: c.contrato.fechaEntrada,
            fechaSalida: c.contrato.fechaSalida,
            numPersonas: String(c.contrato.numPersonas),
            numHabitaciones: String(c.contrato.numHabitaciones),
            internet: c.contrato.internet ? 'true' : 'false',
            pago: {
              tipoPago: c.contrato.pago.tipoPago,
              fechaPago: c.contrato.pago.fechaPago
            }
          },
          persona: c.personas.map((p) => ({
            rol: p.rol,
            nombre: p.nombre,
            apellido1: p.apellido1,
            apellido2: p.apellido2,
            tipoDocumento: p.tipoDocumento,
            numeroDocumento: p.numeroDocumento,
            soporteDocumento: p.soporteDocumento,
            fechaNacimiento: p.fechaNacimiento,
            nacionalidad: p.nacionalidad,
            sexo: p.sexo,
            telefono: p.telefono,
            correo: p.correo,
            direccion: {
              direccion: p.direccion.direccion,
              codigoPostal: p.direccion.codigoPostal,
              pais: p.direccion.pais,
              codigoMunicipio: p.direccion.codigoMunicipio
            }
          }))
        }))
      }
    };
    
    const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele(root);
    const xmlContent = doc.end({ prettyPrint: false });
    
    // Intentar envío al MIR
    const resultado = await client.altaPV({ xmlAlta: xmlContent });
    
    console.log('✅ Resultado MIR PRODUCCIÓN:', resultado);
    
    return NextResponse.json({
      success: true,
      message: 'Test conexión MIR PRODUCCIÓN completado',
      configuracion: {
        baseUrl: configProduccion.baseUrl,
        username: configProduccion.username,
        codigoArrendador: configProduccion.codigoArrendador,
        aplicacion: configProduccion.aplicacion,
        simulacion: configProduccion.simulacion
      },
      resultado: resultado,
      referencia: testData.comunicaciones[0].contrato.referencia,
      lote: resultado.lote || null,
      estado: resultado.ok ? 'enviado' : 'error',
      interpretacion: {
        exito: resultado.ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion,
        lote: resultado.lote ? `Lote asignado: ${resultado.lote}` : 'Sin lote asignado',
        recomendacion: resultado.ok ? 
          '✅ Conexión exitosa - Sistema listo para producción' :
          '⚠️ Revisar configuración - Error en la conexión'
      }
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en test MIR PRODUCCIÓN:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test MIR PRODUCCIÓN',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      diagnostico: {
        tipoError: error instanceof Error ? error.constructor.name : 'Unknown',
        posibleCausa: error instanceof Error && error.message.includes('fetch') ? 
          'Error de conexión - verificar credenciales o certificado SSL' : 
          'Error interno del sistema'
      }
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
