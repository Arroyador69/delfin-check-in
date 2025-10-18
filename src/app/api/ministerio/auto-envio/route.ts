import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';
import { buildPvXml, PvSolicitud } from '@/lib/mir-xml-official';
import { insertMirComunicacion, updateMirComunicacion, MirComunicacion } from '@/lib/mir-db';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Auto-envío al MIR iniciado...');
    
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

    console.log('📋 Datos recibidos para auto-envío:', JSON.stringify(json, null, 2));

    // Obtener tenant_id del header
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    // Cargar configuración MIR desde la base de datos
    let config = {
      baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: '',
      password: '',
      codigoArrendador: '',
      aplicacion: 'Delfin_Check_in',
      simulacion: false
    };

    try {
      const result = await sql`
        SELECT usuario, contraseña, codigo_arrendador, codigo_establecimiento, base_url, aplicacion, simulacion, activo
        FROM mir_configuraciones 
        WHERE propietario_id = ${tenantId}
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      if (result.rows.length > 0 && result.rows[0].activo) {
        const dbConfig = result.rows[0];
        config = {
          baseUrl: dbConfig.base_url || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
          username: dbConfig.usuario || '',
          password: dbConfig.contraseña || '',
          codigoArrendador: dbConfig.codigo_arrendador || '',
          aplicacion: dbConfig.aplicacion || 'Delfin_Check_in',
          simulacion: dbConfig.simulacion || false
        };
        console.log('📋 Configuración MIR cargada desde base de datos');
      } else {
        console.log('📋 No hay configuración activa en BD, usando variables de entorno');
        // Fallback a variables de entorno
        config = {
          baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
          username: process.env.MIR_HTTP_USER || '',
          password: process.env.MIR_HTTP_PASS || '',
          codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
          aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
          simulacion: false
        };
      }
    } catch (dbError) {
      console.error('❌ Error cargando configuración desde BD, usando variables de entorno:', dbError);
      // Fallback a variables de entorno
      config = {
        baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
        username: process.env.MIR_HTTP_USER || '',
        password: process.env.MIR_HTTP_PASS || '',
        codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
        aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
        simulacion: false
      };
    }

    // Crear cliente MIR oficial
    const client = new MinisterioClientOfficial(config);
    
    // Generar referencia única
    const referencia = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Extraer datos del registro de huésped
    const personas = json.personas || [];
    if (personas.length === 0) {
      throw new Error('No se encontraron datos de personas en el registro');
    }

    // Formatear fechas correctamente según normas MIR
    const formatearFechaEntrada = (fecha: string): string => {
      try {
        const fechaObj = new Date(fecha);
        if (isNaN(fechaObj.getTime())) {
          throw new Error('Fecha inválida');
        }
        return fechaObj.toISOString().replace(/\.\d{3}Z$/, ''); // YYYY-MM-DDTHH:mm:ss
      } catch (error) {
        console.error('Error formateando fecha entrada:', error);
        return new Date().toISOString().replace(/\.\d{3}Z$/, '');
      }
    };

    const formatearFechaSalida = (fecha: string): string => {
      try {
        const fechaObj = new Date(fecha);
        if (isNaN(fechaObj.getTime())) {
          throw new Error('Fecha inválida');
        }
        return fechaObj.toISOString().replace(/\.\d{3}Z$/, ''); // YYYY-MM-DDTHH:mm:ss
      } catch (error) {
        console.error('Error formateando fecha salida:', error);
        return new Date(Date.now() + 24*60*60*1000).toISOString().replace(/\.\d{3}Z$/, '');
      }
    };

    console.log('🔍 Debug fechas recibidas:');
    console.log('fechaEntrada original:', json.fechaEntrada);
    console.log('fechaSalida original:', json.fechaSalida);
    console.log('fechaEntrada formateada:', formatearFechaEntrada(json.fechaEntrada));
    console.log('fechaSalida formateada:', formatearFechaSalida(json.fechaSalida));

    // Obtener código de establecimiento desde la configuración
    let codigoEstablecimiento = "0000256653"; // Fallback
    try {
      const establecimientoResult = await sql`
        SELECT codigo_establecimiento
        FROM mir_configuraciones 
        WHERE propietario_id = ${tenantId}
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      if (establecimientoResult.rows.length > 0 && establecimientoResult.rows[0].codigo_establecimiento) {
        codigoEstablecimiento = establecimientoResult.rows[0].codigo_establecimiento;
      }
    } catch (error) {
      console.log('⚠️ Usando código de establecimiento por defecto');
    }

    // Preparar datos para el MIR según esquemas oficiales
    const datosMIR: PvSolicitud = {
      codigoEstablecimiento: codigoEstablecimiento,
      contrato: {
        referencia: referencia,
        fechaContrato: new Date().toISOString().split('T')[0], // xsd:date (YYYY-MM-DD)
        fechaEntrada: formatearFechaEntrada(json.fechaEntrada), // xsd:dateTime (YYYY-MM-DDTHH:mm:ss)
        fechaSalida: formatearFechaSalida(json.fechaSalida), // xsd:dateTime (YYYY-MM-DDTHH:mm:ss)
        numPersonas: personas.length,
        numHabitaciones: 1,
        internet: false,
        pago: {
          tipoPago: "EFECT",
          fechaPago: new Date().toISOString().split('T')[0] // xsd:date (YYYY-MM-DD)
        }
      },
      personas: personas.map((persona: any) => ({
        rol: "VI",
        nombre: persona.nombre || "Viajero",
        apellido1: persona.apellido1 || "Apellido1",
        apellido2: persona.apellido2 || "",
        tipoDocumento: persona.tipoDocumento || "NIF",
        numeroDocumento: persona.numeroDocumento || "12345678Z",
        soporteDocumento: persona.soporteDocumento || persona.numeroDocumento || "12345678Z", // Número de soporte del documento
        fechaNacimiento: persona.fechaNacimiento || "1985-01-01",
        nacionalidad: persona.nacionalidad || "ESP",
        sexo: persona.sexo || "M",
        direccion: {
          direccion: persona.direccion?.direccion || "Calle Ejemplo 123",
          codigoPostal: persona.direccion?.codigoPostal || "28001",
          pais: persona.direccion?.pais || "ESP",
          codigoMunicipio: persona.direccion?.codigoMunicipio || "28079",
          nombreMunicipio: persona.direccion?.nombreMunicipio || "Madrid"
        },
        telefono: persona.contacto?.telefono || "600000000",
        correo: persona.contacto?.correo || "viajero@example.com"
      }))
    };

    console.log('📤 Preparando datos MIR oficiales:', JSON.stringify(datosMIR, null, 2));

    // Generar XML según esquemas oficiales
    const xmlContent = buildPvXml(datosMIR);
    console.log('📄 XML generado (primeros 1000 chars):', xmlContent.substring(0, 1000));

    // Enviar al MIR usando cliente oficial
    const resultado = await client.altaPV({ xmlAlta: xmlContent });
    
    console.log('✅ Resultado del envío al MIR:', resultado);

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

    const id = await insertMirComunicacion(comunicacion);
    console.log('✅ Comunicación guardada en BD con ID:', id);

    // ACTUALIZAR EL REGISTRO ORIGINAL EN guest_registrations
    try {
      // Buscar el registro original por reserva_ref
      const registroOriginal = await sql`
        SELECT id, data FROM guest_registrations 
        WHERE reserva_ref = ${referencia}
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      if (registroOriginal.rows.length > 0) {
        const registro = registroOriginal.rows[0];
        const datosActualizados = {
          ...registro.data,
          mir_status: {
            lote: resultado.lote || null,
            codigoComunicacion: resultado.codigoComunicacion || null,
            fechaEnvio: new Date().toISOString(),
            estado: resultado.ok ? 'enviado' : 'error',
            referencia: referencia,
            error: resultado.ok ? null : resultado.descripcion,
            ultimaActualizacion: new Date().toISOString()
          }
        };

        await sql`
          UPDATE guest_registrations 
          SET data = ${JSON.stringify(datosActualizados)}::jsonb
          WHERE id = ${registro.id}
        `;

        console.log('✅ Registro original actualizado con mir_status:', registro.id);
      } else {
        console.warn('⚠️ No se encontró el registro original para actualizar:', referencia);
      }
    } catch (updateError) {
      console.error('❌ Error actualizando registro original:', updateError);
    }


    return NextResponse.json({
      success: true,
      message: 'Auto-envío al MIR completado',
      referencia: referencia,
      resultado: resultado,
      estado: resultado.ok ? 'enviado' : 'error',
      lote: resultado.lote || null
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en auto-envío al MIR:', error);
    
    // Guardar error en base de datos
    const referencia = `ERROR-${Date.now()}`;
    const comunicacion: Omit<MirComunicacion, 'id' | 'created_at' | 'updated_at'> = {
      referencia: referencia,
      tipo: 'PV',
      estado: 'error',
      lote: null,
      resultado: null,
      error: error instanceof Error ? error.message : 'Error desconocido',
      xml_enviado: null,
      xml_respuesta: null
    };

    try {
      await insertMirComunicacion(comunicacion);
    } catch (saveError) {
      console.error('❌ Error guardando comunicación de error:', saveError);
    }


    return NextResponse.json({
      success: false,
      error: 'Error en auto-envío al MIR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      referencia: referencia
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
