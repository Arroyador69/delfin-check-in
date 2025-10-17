import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';
import { buildPvXml, PvSolicitud } from '@/lib/mir-xml-official';
import { insertMirComunicacion, updateMirComunicacion, MirComunicacion } from '@/lib/mir-db';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Envío oficial al MIR iniciado...');
    
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

    console.log('📋 Datos recibidos para envío oficial:', JSON.stringify(json, null, 2));

    // Verificar credenciales MIR
    if (!process.env.MIR_HTTP_USER || !process.env.MIR_HTTP_PASS || !process.env.MIR_CODIGO_ARRENDADOR) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales MIR no configuradas',
        message: 'Falta configurar MIR_HTTP_USER, MIR_HTTP_PASS o MIR_CODIGO_ARRENDADOR'
      }, { status: 400 });
    }

    // Configuración del MIR con credenciales correctas
    const config = {
      baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER,
      password: process.env.MIR_HTTP_PASS,
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR,
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
      simulacion: process.env.MIR_SIMULACION === 'true'
    };

    console.log('📋 Configuración MIR oficial:', {
      baseUrl: config.baseUrl,
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      aplicacion: config.aplicacion,
      simulacion: config.simulacion
    });

    // Crear cliente MIR oficial
    const client = new MinisterioClientOfficial(config);
    
    // Generar referencia única
    const referencia = `OFICIAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Preparar datos para el MIR según esquemas oficiales
    const datosMIR: PvSolicitud = {
      codigoEstablecimiento: json.codigoEstablecimiento || "0000256653",
      contrato: {
        referencia: referencia,
        fechaContrato: new Date().toISOString().split('T')[0],
        fechaEntrada: json.fechaEntrada || new Date().toISOString().replace(/\.\d{3}Z$/, ''),
        fechaSalida: json.fechaSalida || new Date(Date.now() + 24*60*60*1000).toISOString().replace(/\.\d{3}Z$/, ''),
        numPersonas: json.personas?.length || 1,
        numHabitaciones: json.numHabitaciones || 1,
        internet: json.internet || false,
        pago: {
          tipoPago: json.tipoPago || "EFECT",
          fechaPago: new Date().toISOString().split('T')[0],
          medioPago: json.medioPago,
          titular: json.titular,
          caducidadTarjeta: json.caducidadTarjeta
        }
      },
      personas: json.personas || [{
        rol: "VI",
        nombre: json.nombre || "Viajero",
        apellido1: json.apellido1 || "Apellido1",
        apellido2: json.apellido2 || "",
        tipoDocumento: json.tipoDocumento || "NIF",
        numeroDocumento: json.numeroDocumento || "12345678Z",
        soporteDocumento: json.soporteDocumento,
        fechaNacimiento: json.fechaNacimiento || "1985-01-01",
        nacionalidad: json.nacionalidad || "ESP",
        sexo: json.sexo || "M",
        direccion: {
          direccion: json.direccion || "Calle Ejemplo 123",
          direccionComplementaria: json.direccionComplementaria,
          codigoPostal: json.codigoPostal || "28001",
          pais: json.pais || "ESP",
          codigoMunicipio: json.codigoMunicipio || "28079",
          nombreMunicipio: json.nombreMunicipio || "Madrid"
        },
        telefono: json.telefono || "600000000",
        telefono2: json.telefono2,
        correo: json.correo || "viajero@example.com",
        parentesco: json.parentesco
      }]
    };

    console.log('📤 Preparando datos MIR oficiales:', JSON.stringify(datosMIR, null, 2));

    // Generar XML según esquemas oficiales
    const xmlContent = buildPvXml(datosMIR);
    console.log('📄 XML generado (primeros 1000 chars):', xmlContent.substring(0, 1000));

    // Enviar al MIR usando cliente oficial
    const resultado = await client.altaPV({ xmlAlta: xmlContent });
    
    console.log('✅ Resultado del envío oficial al MIR:', resultado);

    // Guardar comunicación en base de datos
    const comunicacion: Omit<MirComunicacion, 'id' | 'created_at' | 'updated_at'> = {
      referencia: referencia,
      tipo: 'PV',
      estado: resultado.ok ? 'enviado' : 'error',
      lote: resultado.lote || null,
      resultado: JSON.stringify(resultado),
      error: resultado.ok ? null : resultado.descripcion,
      xml_enviado: xmlContent,
      xml_respuesta: resultado.rawResponse
    };

    const comunicacionId = await insertMirComunicacion(comunicacion);
    console.log('💾 Comunicación guardada con ID:', comunicacionId);

    return NextResponse.json({
      success: true,
      message: 'Envío oficial al MIR completado',
      comunicacionId,
      referencia,
      resultado: {
        exito: resultado.ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion,
        lote: resultado.lote,
        codigoComunicacion: resultado.codigoComunicacion
      },
      interpretacion: {
        exito: resultado.ok,
        mensaje: resultado.ok ? 
          `✅ Comunicación enviada correctamente. Lote: ${resultado.lote || 'N/A'}` : 
          `❌ Error en el envío: ${resultado.descripcion}`,
        codigo: resultado.codigo,
        lote: resultado.lote ? `Lote asignado: ${resultado.lote}` : 'Sin lote asignado'
      },
      debug: {
        xmlLength: xmlContent.length,
        soapDebug: resultado.debugSoap ? 'Disponible' : 'No disponible',
        config: {
          baseUrl: config.baseUrl,
          username: config.username,
          codigoArrendador: config.codigoArrendador,
          simulacion: config.simulacion
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en envío oficial al MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en envío oficial al MIR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
