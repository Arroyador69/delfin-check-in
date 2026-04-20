import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';
import { buildPvXml, PvSolicitud } from '@/lib/mir-xml-official';
import { buildRhXml, RhSolicitud } from '@/lib/mir-xml-rh';
import { insertMirComunicacion, MirComunicacion } from '@/lib/mir-db';
import { sql } from '@vercel/postgres';
import { logError } from '@/lib/error-logger';

export async function POST(req: NextRequest) {
  let json: any = undefined;
  let tenantId = 'default';
  let referenciaNorm = 'ERROR-' + Date.now();
  let loadedFromDb = false;
  
  try {
    console.log('🚀 Envío dual PV + RH al MIR iniciado...');
    
    json = await req.json().catch(() => undefined);
    
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

    // Obtener tenant_id del header o del body y limpiar duplicados
    let rawTenantId = req.headers.get('x-tenant-id') || 
                      req.headers.get('X-Tenant-ID') || 
                      json.tenant_id || 
                      'default';
    
    // Limpiar tenant_id: si viene duplicado (separado por coma), tomar solo el primero
    if (rawTenantId.includes(',')) {
      rawTenantId = rawTenantId.split(',')[0].trim();
      console.warn('⚠️ Tenant ID duplicado detectado, usando solo el primero:', rawTenantId);
    }
    
    tenantId = rawTenantId;
    console.log('🏢 Tenant ID para envío dual (limpio):', tenantId);
    console.log('🔍 Headers recibidos:', {
      'x-tenant-id': req.headers.get('x-tenant-id'),
      'X-Tenant-ID': req.headers.get('X-Tenant-ID'),
      'Content-Type': req.headers.get('Content-Type')
    });
    
    // Obtener referencia del JSON si está disponible
    if (json.referencia) {
      referenciaNorm = String(json.referencia).slice(0, 50);
    }

    // Cargar configuración MIR desde la base de datos
    let config = {
      baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: '',
      password: '',
      codigoArrendador: '',
      codigoEstablecimiento: '',
      aplicacion: 'Delfin_Check_in',
      simulacion: false
    };

    let dbResult: { rows?: any[] } | null = null;
    try {
      // Buscar por propietario_id O tenant_id (ambos pueden existir)
      dbResult = await sql`
        SELECT usuario, contraseña, codigo_arrendador, codigo_establecimiento, base_url, aplicacion, simulacion, activo, propietario_id, tenant_id
        FROM mir_configuraciones 
        WHERE propietario_id = ${tenantId} OR tenant_id = ${tenantId}
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      
      const dbRowsLen = dbResult?.rows?.length ?? 0;
      console.log('🔍 Búsqueda de configuración MIR:', {
        tenantIdBuscado: tenantId,
        resultadosEncontrados: dbRowsLen,
        propietario_id_encontrado: dbResult.rows[0]?.propietario_id,
        tenant_id_encontrado: dbResult.rows[0]?.tenant_id
      });

      if (dbRowsLen > 0 && dbResult.rows[0].activo) {
        const dbConfig = dbResult.rows[0];
        config = {
          baseUrl: dbConfig.base_url || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
          username: dbConfig.usuario || '',
          password: dbConfig.contraseña || '',
          codigoArrendador: dbConfig.codigo_arrendador || '',
          codigoEstablecimiento: dbConfig.codigo_establecimiento || '',
          aplicacion: dbConfig.aplicacion || 'Delfin_Check_in',
          simulacion: dbConfig.simulacion || false
        };
      }
    } catch (configError) {
      console.warn('⚠️ No se pudo cargar configuración MIR, usando valores por defecto:', configError);
    }

    console.log('🔧 Configuración MIR cargada:', { 
      ...config, 
      password: '***',
      usernameLength: config.username?.length || 0,
      passwordLength: config.password?.length || 0,
      codigoArrendador: config.codigoArrendador,
      codigoEstablecimiento: config.codigoEstablecimiento,
      simulacion: config.simulacion
    });

    // Validar que las credenciales MIR no estén vacías (a menos que sea simulación)
    if (!config.simulacion) {
      if (!config.username || config.username.trim() === '') {
        console.error('❌ ERROR: Usuario MIR vacío o no configurado');
        const configuracionEncontrada = (dbResult?.rows?.length ?? 0) > 0;
        console.error('🔍 Diagnóstico:', {
          tenantIdBuscado: tenantId,
          configuracionEncontrada,
          propietario_id_encontrado: dbResult?.rows?.[0]?.propietario_id,
          tenant_id_encontrado: dbResult?.rows?.[0]?.tenant_id,
          usuario_encontrado: dbResult?.rows?.[0]?.usuario ? 'SÍ' : 'NO',
          activo: dbResult?.rows?.[0]?.activo
        });
        return NextResponse.json(
          {
            success: false,
            code: 'MIR_CREDENTIALS_MISSING',
            error: 'Credenciales MIR no configuradas',
            message:
              'El usuario MIR está vacío. Por favor, configura las credenciales MIR en la configuración del tenant.',
            tenantId,
            diagnostico: {
              tenantIdBuscado: tenantId,
              configuracionEncontrada,
              propietario_id_encontrado: dbResult?.rows?.[0]?.propietario_id,
              tenant_id_encontrado: dbResult?.rows?.[0]?.tenant_id
            }
          },
          { status: 400 }
        );
      }
      
      if (!config.password || config.password.trim() === '') {
        console.error('❌ ERROR: Contraseña MIR vacía o no configurada');
        return NextResponse.json(
          {
            success: false,
            code: 'MIR_CREDENTIALS_MISSING',
            error: 'Credenciales MIR no configuradas',
            message:
              'La contraseña MIR está vacía. Por favor, configura las credenciales MIR en la configuración del tenant.',
            tenantId
          },
          { status: 400 }
        );
      }
      
      if (!config.codigoArrendador || config.codigoArrendador.trim() === '') {
        console.error('❌ ERROR: Código arrendador MIR vacío o no configurado');
        return NextResponse.json(
          {
            success: false,
            code: 'MIR_CREDENTIALS_MISSING',
            error: 'Credenciales MIR no configuradas',
            message:
              'El código arrendador MIR está vacío. Por favor, configura las credenciales MIR en la configuración del tenant.',
            tenantId
          },
          { status: 400 }
        );
      }
    }

    // Crear cliente MIR
    const client = new MinisterioClientOfficial(config);

    // Extraer datos del JSON según normas MIR (TODO debe venir parseado del JSON, no de la BD)
    let { referencia, fechaEntrada, fechaSalida, personas, tipoPago, pago } = json;

    // Si desde UI/admin solo llega referencia (+ personas), completar desde BD por referencia.
    if (referencia && (!fechaEntrada || !fechaSalida || !Array.isArray(personas) || personas.length === 0)) {
      try {
        const dbReg = await sql`
          SELECT data, fecha_entrada, fecha_salida
          FROM guest_registrations
          WHERE reserva_ref = ${String(referencia)}
            AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
          LIMIT 1
        `;

        const row = dbReg.rows?.[0] as any | undefined;
        const data = row?.data as any | undefined;
        if (row) {
          loadedFromDb = true;
          fechaEntrada =
            fechaEntrada ??
            row.fecha_entrada ??
            data.fechaEntrada ??
            data.fecha_entrada ??
            data.estancia?.fechaEntrada ??
            data.estancia?.fecha_entrada ??
            data.reserva?.fechaEntrada ??
            data.reserva?.fecha_entrada ??
            data.contrato?.fechaEntrada ??
            data.contrato?.fecha_entrada;

          fechaSalida =
            fechaSalida ??
            row.fecha_salida ??
            data.fechaSalida ??
            data.fecha_salida ??
            data.estancia?.fechaSalida ??
            data.estancia?.fecha_salida ??
            data.reserva?.fechaSalida ??
            data.reserva?.fecha_salida ??
            data.contrato?.fechaSalida ??
            data.contrato?.fecha_salida;

          personas =
            (Array.isArray(personas) && personas.length > 0 ? personas : undefined) ??
            data.personas ??
            data.viajeros ??
            data.huespedes ??
            data?.comunicaciones?.[0]?.personas;

          tipoPago = tipoPago ?? data.tipoPago ?? data.pago?.tipoPago;
          pago = pago ?? data.pago;
        }
      } catch (e) {
        console.warn('⚠️ No se pudo completar payload desde guest_registrations:', e);
      }
    }

    const missing: string[] = [];
    if (!referencia) missing.push('referencia');
    if (!fechaEntrada) missing.push('fechaEntrada');
    if (!fechaSalida) missing.push('fechaSalida');
    if (!personas || !Array.isArray(personas) || personas.length === 0) missing.push('personas[]');

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Faltan datos obligatorios: referencia, fechaEntrada, fechaSalida, personas (debe ser un array con al menos una persona)',
          missing,
          loadedFromDb,
        },
        { status: 400 }
      );
    }

    console.log('📅 Fechas:', { fechaEntrada, fechaSalida });
    console.log('👥 Personas:', personas.length);

    // Normalizaciones requeridas por XSD oficial
    referenciaNorm = String(referencia).slice(0, 50);
    const asDateTime = (d: unknown) => {
      if (d == null) return '';
      const s =
        d instanceof Date
          ? d.toISOString()
          : typeof d === 'string'
            ? d
            : typeof d === 'number'
              ? new Date(d).toISOString()
              : String(d);
      return s.includes('T') ? s : `${s}T12:00:00`;
    };
    const fechaEntradaDT = asDateTime(fechaEntrada);
    const fechaSalidaDT = asDateTime(fechaSalida);
    const codigoEstablecimientoFinal = config.codigoEstablecimiento || config.codigoArrendador || '0000256653';

    // Parsear tipo de pago SOLO del JSON según normas MIR (pagoType del XSD)
    // pagoType tiene: tipoPago (obligatorio), fechaPago (opcional), medioPago (opcional), etc.
    let tipoPagoFinal = tipoPago || pago?.tipoPago;
    
    // Si no viene en el JSON, usar 'EFECT' por defecto según normas MIR
    if (!tipoPagoFinal) {
      console.warn('⚠️ tipoPago no viene en el JSON, usando "EFECT" por defecto');
      tipoPagoFinal = 'EFECT';
    }
    
    // Normalizar tipoPago según catálogo MIR (valores válidos según normas)
    // NOTA: Los valores deben coincidir exactamente con el catálogo MIR
    const tipoPagoNorm = tipoPagoFinal === 'EFECT' || tipoPagoFinal === 'EFECTIVO' ? 'EFECT' :
                        tipoPagoFinal === 'TARJ' || tipoPagoFinal === 'TARJETA' || tipoPagoFinal === 'CARD' ? 'TARJ' :
                        tipoPagoFinal === 'TRANSF' || tipoPagoFinal === 'TRANSFERENCIA' ? 'TRANSF' :
                        tipoPagoFinal; // Usar el valor tal cual si no coincide con los anteriores

    // Preparar datos para PV (Parte de Hospedaje)
    const datosPV: PvSolicitud = {
      codigoEstablecimiento: codigoEstablecimientoFinal,
      contrato: {
        referencia: referenciaNorm,
        fechaContrato: new Date().toISOString().split('T')[0],
        fechaEntrada: fechaEntradaDT,
        fechaSalida: fechaSalidaDT,
        numPersonas: personas.length,
        numHabitaciones: 1,
        internet: false,
        pago: {
          tipoPago: tipoPagoNorm,
          fechaPago: pago?.fechaPago || new Date().toISOString().split('T')[0],
          medioPago: pago?.medioPago,
          titular: pago?.titular,
          caducidadTarjeta: pago?.caducidadTarjeta
        }
      },
      personas: personas.map(persona => {
        // CRÍTICO según normas MIR: si hay numeroDocumento, soporteDocumento es OBLIGATORIO
        const numDoc = persona.numeroDocumento || '';
        // Si hay numeroDocumento (no vacío), incluir soporteDocumento con valor 'C' por defecto si no viene
        const soporteDoc = numDoc && numDoc.trim() !== '' 
          ? (persona.soporteDocumento || 'C') 
          : undefined;
        
        const sexoRaw = String(persona.sexo || '').toUpperCase();
        const sexoNorm = sexoRaw === 'H' || sexoRaw === 'M' ? sexoRaw : 'M';

        return {
        rol: "VI",
        nombre: persona.nombre,
        apellido1: persona.apellido1,
        apellido2: persona.apellido2 || '',
        tipoDocumento: persona.tipoDocumento || 'NIF',
          numeroDocumento: numDoc,
          soporteDocumento: soporteDoc,
        fechaNacimiento: persona.fechaNacimiento,
        nacionalidad: persona.nacionalidad || 'ESP',
        sexo: sexoNorm,
        direccion: {
          direccion: persona.direccion?.direccion || 'Calle Ejemplo 123',
          codigoPostal: persona.direccion?.codigoPostal || '28001',
          pais: persona.direccion?.pais || 'ESP',
          codigoMunicipio: persona.direccion?.codigoMunicipio || '28079',
          nombreMunicipio: persona.direccion?.nombreMunicipio || 'Madrid'
        },
        telefono: persona.contacto?.telefono || persona.telefono || '600000000',
        correo: persona.contacto?.correo || persona.correo || 'viajero@example.com'
        };
      })
    };

    // Preparar datos para RH (Reserva de Hospedaje)
    const datosRH: RhSolicitud = {
      codigoEstablecimiento: codigoEstablecimientoFinal,
      contrato: {
        referencia: referenciaNorm,
        fechaContrato: new Date().toISOString().split('T')[0],
        fechaEntrada: fechaEntradaDT,
        fechaSalida: fechaSalidaDT,
        numPersonas: personas.length,
        numHabitaciones: 1,
        internet: false,
        pago: {
          tipoPago: tipoPagoNorm,
          fechaPago: pago?.fechaPago || new Date().toISOString().split('T')[0],
          medioPago: pago?.medioPago,
          titular: pago?.titular,
          caducidadTarjeta: pago?.caducidadTarjeta
        }
      },
      personas: personas.map((persona, index) => {
        // NOTA: Para RH (personaReservaType), NO se incluye soporteDocumento según XSD
        // Solo se usa en PV (personaHospedajeType)
        const numDoc = persona.numeroDocumento || '';
        
        const sexoRaw = String(persona.sexo || '').toUpperCase();
        const sexoNorm = sexoRaw === 'H' || sexoRaw === 'M' ? sexoRaw : 'M';

        return {
        rol: index === 0 ? 'TI' : 'VI',
        nombre: persona.nombre,
        apellido1: persona.apellido1,
        apellido2: persona.apellido2 || '',
        tipoDocumento: persona.tipoDocumento || 'NIF',
          numeroDocumento: numDoc,
          // NO incluir soporteDocumento para RH (no está en personaReservaType)
        fechaNacimiento: persona.fechaNacimiento,
        nacionalidad: persona.nacionalidad || 'ESP',
        sexo: sexoNorm,
        direccion: {
          direccion: persona.direccion?.direccion || 'Calle Ejemplo 123',
          codigoPostal: persona.direccion?.codigoPostal || '28001',
          pais: persona.direccion?.pais || 'ESP',
          codigoMunicipio: persona.direccion?.codigoMunicipio || '28079',
          nombreMunicipio: persona.direccion?.nombreMunicipio || 'Madrid'
        },
        telefono: persona.contacto?.telefono || persona.telefono || '600000000',
        correo: persona.contacto?.correo || persona.correo || 'viajero@example.com'
        };
      })
    };

    console.log('📤 Preparando envío dual PV + RH al MIR (dos peticiones separadas)...');

    // Generar XMLs según esquemas oficiales MIR
    const xmlPV = buildPvXml(datosPV);
    const xmlRH = buildRhXml(datosRH);
    
    console.log('📄 XML PV generado (primeros 500 chars):', xmlPV.substring(0, 500));
    console.log('📄 XML RH generado (primeros 500 chars):', xmlRH.substring(0, 500));

    // Enviar ambos al MIR usando cliente oficial (peticiones separadas)
    const resultados: any = {
      pv: null,
      rh: null
    };

    try {
      console.log('📤 Enviando PV al MIR...');
      resultados.pv = await client.altaPV({ xmlAlta: xmlPV });
      console.log('✅ Resultado PV:', resultados.pv);
    } catch (errorPV) {
      console.error('❌ Error enviando PV:', errorPV);
      resultados.pv = { ok: false, error: errorPV instanceof Error ? errorPV.message : 'Error desconocido' };
      
      // Registrar error en logs del superadmin
      await logError({
        level: 'error',
        message: `Error enviando PV al MIR: ${errorPV instanceof Error ? errorPV.message : 'Error desconocido'}`,
        error: errorPV,
        tenantId: tenantId !== 'default' ? tenantId : null,
        url: '/api/ministerio/auto-envio-dual',
        metadata: {
          referencia: referenciaNorm,
          tipo: 'PV',
          tenantId,
        },
      });
    }

    try {
      console.log('📤 Enviando RH al MIR...');
      resultados.rh = await client.altaRH({ xmlAlta: xmlRH });
      console.log('✅ Resultado RH:', resultados.rh);
    } catch (errorRH) {
      console.error('❌ Error enviando RH:', errorRH);
      resultados.rh = { ok: false, error: errorRH instanceof Error ? errorRH.message : 'Error desconocido' };
      
      // Registrar error en logs del superadmin
      await logError({
        level: 'error',
        message: `Error enviando RH al MIR: ${errorRH instanceof Error ? errorRH.message : 'Error desconocido'}`,
        error: errorRH,
        tenantId: tenantId !== 'default' ? tenantId : null,
        url: '/api/ministerio/auto-envio-dual',
        metadata: {
          referencia: referenciaNorm,
          tipo: 'RH',
          tenantId,
        },
      });
    }

    // Guardar ambas comunicaciones en base de datos por separado
    const comunicacionesGuardadas: any[] = [];

    if (resultados.pv) {
      // Extraer mensaje de error correctamente (puede venir en error, descripcion, o message)
      const errorMessage = resultados.pv.ok 
        ? null 
        : (resultados.pv.error || resultados.pv.descripcion || resultados.pv.message || 'Error desconocido');
      
      const comunicacionPV: Omit<MirComunicacion, 'id' | 'created_at' | 'updated_at'> = {
        referencia: `${referenciaNorm}-PV`,
        tipo: 'PV',
        estado: resultados.pv.ok ? 'enviado' : 'error',
        lote: resultados.pv.lote || null,
        resultado: JSON.stringify(resultados.pv),
        error: errorMessage,
        xml_enviado: xmlPV,
        xml_respuesta: resultados.pv.rawResponse || null,
        tenant_id: tenantId
      };

      try {
        console.log('💾 Intentando guardar comunicación PV:', {
          referencia: comunicacionPV.referencia,
          tipo: comunicacionPV.tipo,
          estado: comunicacionPV.estado,
          lote: comunicacionPV.lote || 'NO ASIGNADO (error o pendiente)',
          tenant_id: comunicacionPV.tenant_id
        });
        const idPV = await insertMirComunicacion(comunicacionPV);
        comunicacionesGuardadas.push({ tipo: 'PV', id: idPV, resultado: resultados.pv });
        console.log('✅ Comunicación PV guardada con ID:', idPV);
      } catch (saveErrorPV) {
        console.error('❌ Error guardando comunicación PV:', saveErrorPV);
        console.error('❌ Detalles del error:', {
          error: saveErrorPV instanceof Error ? saveErrorPV.message : String(saveErrorPV),
          stack: saveErrorPV instanceof Error ? saveErrorPV.stack : undefined,
          comunicacion: comunicacionPV
        });
      }
    }

    if (resultados.rh) {
      // Extraer mensaje de error correctamente (puede venir en error, descripcion, o message)
      const errorMessage = resultados.rh.ok 
        ? null 
        : (resultados.rh.error || resultados.rh.descripcion || resultados.rh.message || 'Error desconocido');
      
      const comunicacionRH: Omit<MirComunicacion, 'id' | 'created_at' | 'updated_at'> = {
        referencia: `${referenciaNorm}-RH`,
        tipo: 'RH',
        estado: resultados.rh.ok ? 'enviado' : 'error',
        lote: resultados.rh.lote || null,
        resultado: JSON.stringify(resultados.rh),
        error: errorMessage,
        xml_enviado: xmlRH,
        xml_respuesta: resultados.rh.rawResponse || null,
        tenant_id: tenantId
      };

      try {
        console.log('💾 Intentando guardar comunicación RH:', {
          referencia: comunicacionRH.referencia,
          tipo: comunicacionRH.tipo,
          estado: comunicacionRH.estado,
          lote: comunicacionRH.lote || 'NO ASIGNADO (error o pendiente)',
          tenant_id: comunicacionRH.tenant_id
        });
        const idRH = await insertMirComunicacion(comunicacionRH);
        comunicacionesGuardadas.push({ tipo: 'RH', id: idRH, resultado: resultados.rh });
        console.log('✅ Comunicación RH guardada con ID:', idRH);
      } catch (saveErrorRH) {
        console.error('❌ Error guardando comunicación RH:', saveErrorRH);
        console.error('❌ Detalles del error:', {
          error: saveErrorRH instanceof Error ? saveErrorRH.message : String(saveErrorRH),
          stack: saveErrorRH instanceof Error ? saveErrorRH.stack : undefined,
          comunicacion: comunicacionRH
        });
      }
    }

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
      resultados,
      referencia: referenciaNorm,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en envío dual al MIR:', error);
    
    // Guardar errores en mir_comunicaciones para que aparezcan en la página de estados
    try {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // Guardar error para PV
      await insertMirComunicacion({
        referencia: `${referenciaNorm}-PV`,
        tipo: 'PV',
        estado: 'error',
        error: `Error crítico: ${errorMessage}`,
        resultado: JSON.stringify({ 
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          tipo: 'critical_error'
        }),
        tenant_id: tenantId !== 'default' ? tenantId : undefined
      });
      
      // Guardar error para RH
      await insertMirComunicacion({
        referencia: `${referenciaNorm}-RH`,
        tipo: 'RH',
        estado: 'error',
        error: `Error crítico: ${errorMessage}`,
        resultado: JSON.stringify({ 
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          tipo: 'critical_error'
        }),
        tenant_id: tenantId !== 'default' ? tenantId : undefined
      });
      
      console.log('✅ Errores críticos guardados en mir_comunicaciones');
    } catch (saveError) {
      console.error('❌ Error guardando errores críticos en mir_comunicaciones:', saveError);
    }
    
    // Registrar error en logs del superadmin
    await logError({
      level: 'error',
      message: `Error crítico en envío dual al MIR: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      error,
      tenantId: tenantId !== 'default' ? tenantId : null,
      url: '/api/ministerio/auto-envio-dual',
      metadata: {
        errorType: 'dual_send_failure',
        tenantId,
      },
    });
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}




