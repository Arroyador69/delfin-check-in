import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';
import { buildRhXml, RhSolicitud } from '@/lib/mir-xml-rh';
import { insertMirComunicacion, updateMirComunicacion, MirComunicacion } from '@/lib/mir-db';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🏨 Auto-envío RH (Reservas de Hospedaje) al MIR iniciado...');
    
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

    console.log('📋 Datos recibidos para auto-envío RH:', JSON.stringify(json, null, 2));

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
        console.log('📋 Configuración MIR cargada desde base de datos para RH');
      } else {
        console.log('📋 No hay configuración activa en BD, usando variables de entorno para RH');
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
      console.error('❌ Error cargando configuración desde BD, usando variables de entorno para RH:', dbError);
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
    
    // Generar referencia única para RH
    const referencia = `RH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Extraer datos del registro de huésped - manejar diferentes formatos
    let personas = [];
    let fechaEntrada = json.fechaEntrada;
    let fechaSalida = json.fechaSalida;
    let codigoEstablecimiento = json.codigoEstablecimiento || "0000256653";
    
    if (json.personas && Array.isArray(json.personas)) {
      // Formato directo: { personas: [...] }
      personas = json.personas;
    } else if (json.comunicaciones && Array.isArray(json.comunicaciones) && json.comunicaciones[0]?.personas) {
      // Formato de base de datos: { comunicaciones: [{ personas: [...] }] }
      personas = json.comunicaciones[0].personas;
      fechaEntrada = json.comunicaciones[0].contrato?.fechaEntrada || fechaEntrada;
      fechaSalida = json.comunicaciones[0].contrato?.fechaSalida || fechaSalida;
      codigoEstablecimiento = json.codigoEstablecimiento || codigoEstablecimiento;
    } else if (json.data?.comunicaciones && Array.isArray(json.data.comunicaciones) && json.data.comunicaciones[0]?.personas) {
      // Formato anidado: { data: { comunicaciones: [{ personas: [...] }] } }
      personas = json.data.comunicaciones[0].personas;
      fechaEntrada = json.data.comunicaciones[0].contrato?.fechaEntrada || fechaEntrada;
      fechaSalida = json.data.comunicaciones[0].contrato?.fechaSalida || fechaSalida;
      codigoEstablecimiento = json.data.codigoEstablecimiento || codigoEstablecimiento;
    } else {
      console.error('❌ No se encontraron datos de personas en el formato esperado');
      return NextResponse.json({ 
        error: 'No se encontraron datos de personas en el formato esperado' 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (personas.length === 0) {
      console.error('❌ No hay personas para procesar');
      return NextResponse.json({ 
        error: 'No hay personas para procesar' 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('👥 Personas encontradas para RH:', personas.length);
    console.log('📅 Fechas:', { fechaEntrada, fechaSalida });
    console.log('🏨 Código establecimiento:', codigoEstablecimiento);

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
        return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '');
      }
    };

    // Preparar datos para RH (Reservas de Hospedaje)
    // Para RH, el primer viajero debe ser TI (Titular), el resto VI (Viajeros)
    const personasRH = personas.map((persona: any, index: number) => ({
      rol: index === 0 ? "TI" : "VI", // Primer viajero es titular, resto son viajeros
      nombre: persona.nombre || "Viajero",
      apellido1: persona.apellido1 || "Apellido1",
      apellido2: persona.apellido2 || "",
      tipoDocumento: persona.tipoDocumento || "NIF",
      numeroDocumento: persona.numeroDocumento || "12345678Z",
      soporteDocumento: persona.soporteDocumento || persona.numeroDocumento || "12345678Z",
      fechaNacimiento: persona.fechaNacimiento || "1985-01-01",
      nacionalidad: persona.nacionalidad || "ESP",
      sexo: persona.sexo || "M",
      direccion: {
        direccion: persona.direccion?.direccion || "Calle Ejemplo 123",
        direccionComplementaria: persona.direccion?.direccionComplementaria || "",
        codigoMunicipio: persona.direccion?.codigoMunicipio || "",
        nombreMunicipio: persona.direccion?.nombreMunicipio || "",
        codigoPostal: persona.direccion?.codigoPostal || "28001",
        pais: persona.direccion?.pais || "ESP"
      },
      telefono: persona.contacto?.telefono || persona.telefono || "",
      telefono2: persona.contacto?.telefono2 || persona.telefono2 || "",
      correo: persona.contacto?.correo || persona.correo || "",
      parentesco: persona.parentesco || ""
    }));

    const datosMIR: RhSolicitud = {
      codigoEstablecimiento: codigoEstablecimiento,
      contrato: {
        referencia: referencia,
        fechaContrato: new Date().toISOString().split('T')[0], // xsd:date (YYYY-MM-DD)
        fechaEntrada: formatearFechaEntrada(fechaEntrada), // xsd:dateTime (YYYY-MM-DDTHH:mm:ss)
        fechaSalida: formatearFechaSalida(fechaSalida), // xsd:dateTime (YYYY-MM-DDTHH:mm:ss)
        numPersonas: personas.length,
        numHabitaciones: 1,
        internet: false,
        pago: {
          tipoPago: "EFECT",
          fechaPago: new Date().toISOString().split('T')[0] // xsd:date (YYYY-MM-DD)
        }
      },
      personas: personasRH
    };

    console.log('📤 Preparando datos MIR oficiales para RH:', JSON.stringify(datosMIR, null, 2));

    // Generar XML según esquemas oficiales para RH
    const xmlContent = buildRhXml(datosMIR);
    console.log('📄 XML RH generado (primeros 1000 chars):', xmlContent.substring(0, 1000));

    // Enviar al MIR usando cliente oficial
    const resultado = await client.altaRH({ xmlAlta: xmlContent });
    
    console.log('✅ Resultado del envío RH al MIR:', resultado);

    // Guardar comunicación en base de datos
    const comunicacion: MirComunicacion = {
      id: `rh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipo: 'RH',
      estado: resultado.ok ? 'ENVIADO' : 'ERROR',
      codigo: resultado.codigo || '',
      descripcion: resultado.descripcion || '',
      xml_enviado: xmlContent,
      xml_respuesta: resultado.xmlRespuesta || '',
      fecha_envio: new Date().toISOString(),
      propietario_id: tenantId,
      referencia: referencia,
      num_personas: personas.length,
      fecha_entrada: formatearFechaEntrada(fechaEntrada),
      fecha_salida: formatearFechaSalida(fechaSalida)
    };

    try {
      await insertMirComunicacion(comunicacion);
      console.log('✅ Comunicación RH guardada en base de datos');
    } catch (dbError) {
      console.error('⚠️ Error guardando comunicación RH en BD:', dbError);
    }

    return NextResponse.json({
      success: true,
      message: 'Reserva de Hospedaje (RH) enviada al MIR correctamente',
      tipo: 'RH',
      resultado: {
        exito: resultado.ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion,
        comunicacion_id: comunicacion.id,
        referencia: referencia
      },
      interpretacion: {
        exito: resultado.ok,
        mensaje: resultado.ok ? 
          `✅ Reserva de Hospedaje enviada correctamente al MIR` : 
          `❌ Error en el envío de la Reserva de Hospedaje: ${resultado.descripcion}`,
        codigo: resultado.codigo
      },
      debug: {
        config: {
          baseUrl: config.baseUrl,
          username: config.username,
          codigoArrendador: config.codigoArrendador,
          simulacion: config.simulacion
        },
        datosEnviados: {
          codigoEstablecimiento: codigoEstablecimiento,
          referencia: referencia,
          numPersonas: personas.length,
          fechaEntrada: formatearFechaEntrada(fechaEntrada),
          fechaSalida: formatearFechaSalida(fechaSalida)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en auto-envío RH:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en auto-envío RH',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
