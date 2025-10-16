import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Test conexión MIR PRUEBAS iniciado...');
    
    // Configuración actual (PRUEBAS)
    const configPruebas = {
      baseUrl: 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in',
      simulacion: false // Envío real a pruebas
    };

    console.log('📋 Configuración PRUEBAS:', {
      baseUrl: configPruebas.baseUrl,
      username: configPruebas.username,
      codigoArrendador: configPruebas.codigoArrendador,
      aplicacion: configPruebas.aplicacion,
      simulacion: configPruebas.simulacion
    });

    // Verificar que tenemos las credenciales
    if (!configPruebas.username || !configPruebas.password || !configPruebas.codigoArrendador) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales incompletas',
        message: 'Faltan username, password o codigoArrendador en variables de entorno'
      }, { status: 400 });
    }

    // Datos de prueba
    const testData = {
      codigoEstablecimiento: configPruebas.codigoArrendador,
      comunicaciones: [{
        contrato: {
          referencia: `TEST-PRUEBAS-${Date.now()}`,
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
          apellido1: "Pruebas",
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
    
    console.log('📤 Enviando test a MIR PRUEBAS...');
    
    // Importar y usar el cliente MIR
    const { MinisterioClientVercel } = await import('@/lib/ministerio-client-vercel');
    const client = new MinisterioClientVercel(configPruebas);
    
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
    
    console.log('✅ Resultado MIR PRUEBAS:', resultado);
    
    return NextResponse.json({
      success: true,
      message: 'Test conexión MIR PRUEBAS completado',
      configuracion: {
        baseUrl: configPruebas.baseUrl,
        username: configPruebas.username,
        codigoArrendador: configPruebas.codigoArrendador,
        aplicacion: configPruebas.aplicacion,
        simulacion: configPruebas.simulacion
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
          '✅ Conexión exitosa - Sistema funcionando correctamente en PRUEBAS' :
          '⚠️ Revisar configuración - Error en la conexión'
      }
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en test MIR PRUEBAS:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test MIR PRUEBAS',
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


