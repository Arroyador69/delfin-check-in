import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';
import { buildPvXml, PvSolicitud } from '@/lib/mir-xml-official';
import { insertMirComunicacion, MirComunicacion } from '@/lib/mir-db';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Envío multitenant al MIR iniciado...');
    
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

    const { propietarioId, datosComunicacion } = json;
    
    if (!propietarioId) {
      return NextResponse.json({
        success: false,
        error: 'propietarioId requerido',
        message: 'Debe proporcionar el ID del propietario'
      }, { status: 400 });
    }

    console.log('📋 Enviando comunicación para propietario:', propietarioId);
    console.log('📋 Datos de comunicación:', JSON.stringify(datosComunicacion, null, 2));

    // Obtener configuración MIR del propietario
    const configResult = await sql`
      SELECT 
        usuario,
        contraseña,
        codigo_arrendador,
        base_url,
        aplicacion,
        simulacion,
        activo
      FROM mir_configuraciones 
      WHERE propietario_id = ${propietarioId}
      AND activo = true
    `;

    if (configResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Configuración MIR no encontrada',
        message: 'No se encontró configuración MIR activa para este propietario'
      }, { status: 404 });
    }

    const config = configResult.rows[0];
    
    if (!config.activo) {
      return NextResponse.json({
        success: false,
        error: 'Configuración MIR inactiva',
        message: 'La configuración MIR para este propietario está inactiva'
      }, { status: 400 });
    }

    // Configuración del MIR para este propietario
    const mirConfig = {
      baseUrl: config.base_url,
      username: config.usuario,
      password: config.contraseña,
      codigoArrendador: config.codigo_arrendador,
      aplicacion: config.aplicacion,
      simulacion: config.simulacion
    };

    console.log('📋 Configuración MIR del propietario:', {
      baseUrl: mirConfig.baseUrl,
      username: mirConfig.username,
      codigoArrendador: mirConfig.codigoArrendador,
      simulacion: mirConfig.simulacion
    });

    // Crear cliente MIR oficial para este propietario
    const client = new MinisterioClientOfficial(mirConfig);
    
    // Generar referencia única
    const referencia = `${propietarioId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Preparar datos para el MIR según esquemas oficiales
    const datosMIR: PvSolicitud = {
      codigoEstablecimiento: datosComunicacion.codigoEstablecimiento || "0000256653",
      contrato: {
        referencia: referencia,
        fechaContrato: new Date().toISOString().split('T')[0],
        fechaEntrada: datosComunicacion.fechaEntrada || new Date().toISOString().replace(/\.\d{3}Z$/, ''),
        fechaSalida: datosComunicacion.fechaSalida || new Date(Date.now() + 24*60*60*1000).toISOString().replace(/\.\d{3}Z$/, ''),
        numPersonas: datosComunicacion.personas?.length || 1,
        numHabitaciones: datosComunicacion.numHabitaciones || 1,
        internet: datosComunicacion.internet || false,
        pago: {
          tipoPago: datosComunicacion.tipoPago || "EFECT",
          fechaPago: new Date().toISOString().split('T')[0],
          medioPago: datosComunicacion.medioPago,
          titular: datosComunicacion.titular,
          caducidadTarjeta: datosComunicacion.caducidadTarjeta
        }
      },
      personas: datosComunicacion.personas || [{
        rol: "VI",
        nombre: datosComunicacion.nombre || "Viajero",
        apellido1: datosComunicacion.apellido1 || "Apellido1",
        apellido2: datosComunicacion.apellido2 || "",
        tipoDocumento: datosComunicacion.tipoDocumento || "NIF",
        numeroDocumento: datosComunicacion.numeroDocumento || "12345678Z",
        soporteDocumento: datosComunicacion.soporteDocumento,
        fechaNacimiento: datosComunicacion.fechaNacimiento || "1985-01-01",
        nacionalidad: datosComunicacion.nacionalidad || "ESP",
        sexo: datosComunicacion.sexo || "M",
        direccion: {
          direccion: datosComunicacion.direccion || "Calle Ejemplo 123",
          direccionComplementaria: datosComunicacion.direccionComplementaria,
          codigoPostal: datosComunicacion.codigoPostal || "28001",
          pais: datosComunicacion.pais || "ESP",
          codigoMunicipio: datosComunicacion.codigoMunicipio || "28079",
          nombreMunicipio: datosComunicacion.nombreMunicipio || "Madrid"
        },
        telefono: datosComunicacion.telefono || "600000000",
        telefono2: datosComunicacion.telefono2,
        correo: datosComunicacion.correo || "viajero@example.com",
        parentesco: datosComunicacion.parentesco
      }]
    };

    console.log('📤 Preparando datos MIR oficiales para propietario:', JSON.stringify(datosMIR, null, 2));

    // Generar XML según esquemas oficiales
    const xmlContent = buildPvXml(datosMIR);
    console.log('📄 XML generado (primeros 1000 chars):', xmlContent.substring(0, 1000));

    // Enviar al MIR usando cliente oficial del propietario
    const resultado = await client.altaPV({ xmlAlta: xmlContent });
    
    console.log('✅ Resultado del envío al MIR para propietario:', propietarioId, resultado);

    // Guardar comunicación en base de datos con contexto del propietario
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

    const id = await insertMirComunicacion(comunicacion);
    console.log('✅ Comunicación guardada en BD con ID:', id);

    return NextResponse.json({
      success: true,
      message: 'Comunicación enviada y registrada correctamente',
      propietarioId,
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
          `✅ Comunicación enviada correctamente. Lote: ${resultado.lote}` : 
          `❌ Error en el envío: ${resultado.descripcion}`,
        codigo: resultado.codigo
      },
      id
    });

  } catch (error) {
    console.error('❌ Error en envío multitenant al MIR:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error en envío multitenant al MIR', 
      details: error instanceof Error ? error.message : String(error) 
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

