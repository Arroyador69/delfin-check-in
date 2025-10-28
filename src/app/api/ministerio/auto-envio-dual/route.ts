import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';
import { buildPvXml, PvSolicitud } from '@/lib/mir-xml-official';
import { buildRhXml, RhSolicitud } from '@/lib/mir-xml-rh';
import { insertMirComunicacion, MirComunicacion } from '@/lib/mir-db';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Envío dual PV + RH al MIR iniciado...');
    
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

    console.log('📋 Datos recibidos para envío dual:', JSON.stringify(json, null, 2));

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
      }
    } catch (configError) {
      console.warn('⚠️ No se pudo cargar configuración MIR, usando valores por defecto:', configError);
    }

    console.log('🔧 Configuración MIR cargada:', { ...config, password: '***' });

    // Crear cliente MIR
    const client = new MinisterioClientOfficial(config);

    // Extraer datos del JSON
    const { referencia, fechaEntrada, fechaSalida, personas } = json;
    
    if (!referencia || !fechaEntrada || !fechaSalida || !personas || !Array.isArray(personas) || personas.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Faltan datos obligatorios: referencia, fechaEntrada, fechaSalida, personas (debe ser un array con al menos una persona)'
      }, { status: 400 });
    }

    console.log('📅 Fechas:', { fechaEntrada, fechaSalida });
    console.log('👥 Personas:', personas.length);

    // Preparar datos para PV (Parte de Hospedaje)
    const datosPV: PvSolicitud = {
      codigoEstablecimiento: config.codigoArrendador || "0000256653",
      contrato: {
        referencia: referencia,
        fechaContrato: new Date().toISOString().split('T')[0],
        fechaEntrada: fechaEntrada,
        fechaSalida: fechaSalida,
        numPersonas: personas.length,
        numHabitaciones: 1,
        internet: false,
        pago: {
          tipoPago: "EFECT",
          fechaPago: new Date().toISOString().split('T')[0]
        }
      },
      personas: personas.map(persona => ({
        rol: "VI",
        nombre: persona.nombre,
        apellido1: persona.apellido1,
        apellido2: persona.apellido2 || '',
        tipoDocumento: persona.tipoDocumento || 'NIF',
        numeroDocumento: persona.numeroDocumento || '12345678Z',
        fechaNacimiento: persona.fechaNacimiento,
        nacionalidad: persona.nacionalidad || 'ESP',
        sexo: persona.sexo || 'M',
        direccion: {
          direccion: persona.direccion?.direccion || 'Calle Ejemplo 123',
          codigoPostal: persona.direccion?.codigoPostal || '28001',
          pais: persona.direccion?.pais || 'ESP',
          codigoMunicipio: persona.direccion?.codigoMunicipio || '28079',
          nombreMunicipio: persona.direccion?.nombreMunicipio || 'Madrid'
        },
        telefono: persona.contacto?.telefono || '600000000',
        correo: persona.contacto?.correo || 'viajero@example.com'
      }))
    };

    // Preparar datos para RH (Reserva de Hospedaje)
    const datosRH: RhSolicitud = {
      codigoEstablecimiento: config.codigoArrendador || "0000256653",
      contrato: {
        referencia: referencia,
        fechaContrato: new Date().toISOString().split('T')[0],
        fechaEntrada: fechaEntrada,
        fechaSalida: fechaSalida,
        numPersonas: personas.length,
        numHabitaciones: 1,
        internet: false,
        pago: {
          tipoPago: "EFECT",
          fechaPago: new Date().toISOString().split('T')[0]
        }
      },
      personas: personas.map(persona => ({
        rol: "VI",
        nombre: persona.nombre,
        apellido1: persona.apellido1,
        apellido2: persona.apellido2 || '',
        tipoDocumento: persona.tipoDocumento || 'NIF',
        numeroDocumento: persona.numeroDocumento || '12345678Z',
        fechaNacimiento: persona.fechaNacimiento,
        nacionalidad: persona.nacionalidad || 'ESP',
        sexo: persona.sexo || 'M',
        direccion: {
          direccion: persona.direccion?.direccion || 'Calle Ejemplo 123',
          codigoPostal: persona.direccion?.codigoPostal || '28001',
          pais: persona.direccion?.pais || 'ESP',
          codigoMunicipio: persona.direccion?.codigoMunicipio || '28079',
          nombreMunicipio: persona.direccion?.nombreMunicipio || 'Madrid'
        },
        telefono: persona.contacto?.telefono || '600000000',
        correo: persona.contacto?.correo || 'viajero@example.com'
      }))
    };

    console.log('📤 Preparando envío dual PV + RH al MIR...');

    // Generar XMLs según esquemas oficiales MIR
    const xmlPV = buildPvXml(datosPV);
    const xmlRH = buildRhXml(datosRH);
    
    console.log('📄 XML PV generado (primeros 500 chars):', xmlPV.substring(0, 500));
    console.log('📄 XML RH generado (primeros 500 chars):', xmlRH.substring(0, 500));

    // Enviar ambos al MIR usando cliente oficial
    const resultados = {
      pv: null,
      rh: null
    };

    try {
      // Enviar PV (Parte de Hospedaje)
      console.log('📤 Enviando PV al MIR...');
      resultados.pv = await client.altaPV({ xmlAlta: xmlPV });
      console.log('✅ Resultado PV:', resultados.pv);
    } catch (errorPV) {
      console.error('❌ Error enviando PV:', errorPV);
      resultados.pv = { ok: false, error: errorPV instanceof Error ? errorPV.message : 'Error desconocido' };
    }

    try {
      // Enviar RH (Reserva de Hospedaje)
      console.log('📤 Enviando RH al MIR...');
      resultados.rh = await client.altaRH({ xmlAlta: xmlRH });
      console.log('✅ Resultado RH:', resultados.rh);
    } catch (errorRH) {
      console.error('❌ Error enviando RH:', errorRH);
      resultados.rh = { ok: false, error: errorRH instanceof Error ? errorRH.message : 'Error desconocido' };
    }

    // Guardar ambas comunicaciones en base de datos
    const comunicacionesGuardadas = [];

    // Guardar comunicación PV
    if (resultados.pv) {
      const comunicacionPV: Omit<MirComunicacion, 'id' | 'created_at' | 'updated_at'> = {
        referencia: `${referencia}-PV`,
        tipo: 'PV',
        estado: resultados.pv.ok ? 'enviado' : 'error',
        lote: resultados.pv.lote || null,
        resultado: JSON.stringify(resultados.pv),
        error: resultados.pv.ok ? null : resultados.pv.error,
        xml_enviado: xmlPV,
        xml_respuesta: resultados.pv.rawResponse || null
      };

      try {
        const idPV = await insertMirComunicacion(comunicacionPV);
        comunicacionesGuardadas.push({ tipo: 'PV', id: idPV, resultado: resultados.pv });
        console.log('✅ Comunicación PV guardada con ID:', idPV);
      } catch (saveErrorPV) {
        console.error('❌ Error guardando comunicación PV:', saveErrorPV);
      }
    }

    // Guardar comunicación RH
    if (resultados.rh) {
      const comunicacionRH: Omit<MirComunicacion, 'id' | 'created_at' | 'updated_at'> = {
        referencia: `${referencia}-RH`,
        tipo: 'RH',
        estado: resultados.rh.ok ? 'enviado' : 'error',
        lote: resultados.rh.lote || null,
        resultado: JSON.stringify(resultados.rh),
        error: resultados.rh.ok ? null : resultados.rh.error,
        xml_enviado: xmlRH,
        xml_respuesta: resultados.rh.rawResponse || null
      };

      try {
        const idRH = await insertMirComunicacion(comunicacionRH);
        comunicacionesGuardadas.push({ tipo: 'RH', id: idRH, resultado: resultados.rh });
        console.log('✅ Comunicación RH guardada con ID:', idRH);
      } catch (saveErrorRH) {
        console.error('❌ Error guardando comunicación RH:', saveErrorRH);
      }
    }

    // Determinar estado general
    const pvExitoso = resultados.pv?.ok === true;
    const rhExitoso = resultados.rh?.ok === true;
    const estadoGeneral = (pvExitoso && rhExitoso) ? 'enviado' : 'parcial';

    console.log('📊 Resumen del envío dual:', {
      pv: pvExitoso ? '✅ Exitoso' : '❌ Error',
      rh: rhExitoso ? '✅ Exitoso' : '❌ Error',
      estadoGeneral
    });

    return NextResponse.json({
      success: true,
      estado: estadoGeneral,
      comunicaciones: comunicacionesGuardadas,
      resultados: {
        pv: resultados.pv,
        rh: resultados.rh
      },
      referencia: referencia,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en envío dual al MIR:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}




