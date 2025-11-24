import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Obteniendo estado de envíos al MIR...');
    
    // Obtener tenant_id del header o query params
    const tenantId = req.headers.get('x-tenant-id') || 
                     req.headers.get('X-Tenant-ID') ||
                     req.nextUrl.searchParams.get('tenant_id') ||
                     null;
    
    console.log('🏢 Tenant ID para estado-envios:', tenantId);
    
    // Obtener registros de guest_registrations CON TODAS sus comunicaciones MIR (PV y RH)
    // IMPORTANTE: 
    // - WHERE filtra por tenant_id para seguridad (solo registros del tenant actual)
    // - JOIN es flexible para encontrar comunicaciones MIR por referencia (sin filtrar por tenant_id en el JOIN)
    //   Esto permite encontrar comunicaciones antiguas que pueden tener tenant_id NULL o diferente
    const result = tenantId 
      ? await sql`
          SELECT 
            gr.id,
            gr.created_at,
            gr.fecha_entrada,
            gr.fecha_salida,
            gr.data,
            gr.reserva_ref,
            gr.tenant_id,
            mc.id as mir_id,
            mc.referencia as mir_referencia,
            mc.tipo as mir_tipo,
            mc.estado as mir_estado,
            mc.lote as mir_lote,
            mc.resultado as mir_resultado,
            mc.error as mir_error,
            mc.created_at as mir_created_at,
            mc.xml_respuesta as mir_xml_respuesta,
            mc.tenant_id as mir_tenant_id
          FROM guest_registrations gr
          LEFT JOIN mir_comunicaciones mc ON (
            gr.comunicacion_id = mc.referencia OR 
            gr.reserva_ref = mc.referencia OR
            mc.referencia LIKE gr.reserva_ref || '%' OR
            gr.reserva_ref = SPLIT_PART(mc.referencia, '-', 1)
          )
          WHERE gr.tenant_id = ${tenantId}
          ORDER BY gr.created_at DESC, mc.tipo ASC
        `
      : await sql`
          SELECT 
            gr.id,
            gr.created_at,
            gr.fecha_entrada,
            gr.fecha_salida,
            gr.data,
            gr.reserva_ref,
            gr.tenant_id,
            mc.id as mir_id,
            mc.referencia as mir_referencia,
            mc.tipo as mir_tipo,
            mc.estado as mir_estado,
            mc.lote as mir_lote,
            mc.resultado as mir_resultado,
            mc.error as mir_error,
            mc.created_at as mir_created_at,
            mc.xml_respuesta as mir_xml_respuesta,
            mc.tenant_id as mir_tenant_id
          FROM guest_registrations gr
          LEFT JOIN mir_comunicaciones mc ON (
            gr.comunicacion_id = mc.referencia OR 
            gr.reserva_ref = mc.referencia OR
            mc.referencia LIKE gr.reserva_ref || '%' OR
            gr.reserva_ref = SPLIT_PART(mc.referencia, '-', 1)
          )
          ORDER BY gr.created_at DESC, mc.tipo ASC
        `;
    
    console.log(`📋 Encontrados ${result.rows.length} registros`);
    
    // Procesar registros y categorizar por estado MIR
    const comunicaciones = {
      pendientes: [],
      enviados: [],
      confirmados: [],
      errores: []
    };
    
    let estadisticas = {
      total: 0,
      pendientes: 0,
      enviados: 0,
      confirmados: 0,
      errores: 0
    };
    
    // Agrupar registros por guest_registration_id para manejar múltiples comunicaciones
    const registrosAgrupados = new Map();
    
    result.rows.forEach(registro => {
      const guestId = registro.id;
      
      if (!registrosAgrupados.has(guestId)) {
        registrosAgrupados.set(guestId, {
          guest_registration: registro,
          comunicaciones_mir: []
        });
      }
      
      // Si hay comunicación MIR, añadirla al grupo
      if (registro.mir_id) {
        registrosAgrupados.get(guestId).comunicaciones_mir.push({
          id: registro.mir_id,
          referencia: registro.mir_referencia,
          tipo: registro.mir_tipo,
          estado: registro.mir_estado,
          lote: registro.mir_lote,
          resultado: registro.mir_resultado,
          error: registro.mir_error,
          created_at: registro.mir_created_at,
          tenant_id: registro.mir_tenant_id
        });
      }
    });
    
    // Procesar cada grupo de registros
    registrosAgrupados.forEach((grupo, guestId) => {
      const registro = grupo.guest_registration;
      const comunicacionesMIR = grupo.comunicaciones_mir;
      
      // Extraer nombre del huésped
      let nombreCompleto = 'Datos no disponibles';
      try {
        if (registro.data?.comunicaciones?.[0]?.personas?.[0]) {
          const persona = registro.data.comunicaciones[0].personas[0];
          nombreCompleto = `${persona.nombre || ''} ${persona.apellido1 || ''} ${persona.apellido2 || ''}`.trim();
        }
      } catch (error) {
        console.log('Error extrayendo nombre del huésped:', error);
      }
      
      // Verificar el campo mir_status dentro de los datos del registro
      const mirStatusFromData = registro.data?.mir_status || {};
      const estadoFromData = mirStatusFromData.estado;
      const loteFromData = mirStatusFromData.lote;
      
      // Determinar estados de PV y RH por separado
      const estadoPV = comunicacionesMIR.find(c => c.tipo === 'PV')?.estado || estadoFromData;
      const estadoRH = comunicacionesMIR.find(c => c.tipo === 'RH')?.estado || estadoFromData;
      const lotePV = comunicacionesMIR.find(c => c.tipo === 'PV')?.lote || loteFromData;
      const loteRH = comunicacionesMIR.find(c => c.tipo === 'RH')?.lote || loteFromData;
      
      // Crear comunicaciones separadas para PV y RH si existen
      const comunicacionesParaMostrar = [];
      
      // Comunicación PV
      if (comunicacionesMIR.find(c => c.tipo === 'PV') || estadoFromData) {
        comunicacionesParaMostrar.push({
          id: `${registro.id}-PV`,
          timestamp: registro.created_at,
          datos: registro.data,
          nombreCompleto: nombreCompleto,
          referencia: registro.reserva_ref,
          tipo: 'PV',
          lote: lotePV,
          error: comunicacionesMIR.find(c => c.tipo === 'PV')?.error,
          fechaEnvio: comunicacionesMIR.find(c => c.tipo === 'PV')?.created_at,
          estado: estadoPV === 'enviado' ? 'enviado' : estadoPV === 'error' ? 'error' : 'pendiente',
          tenant_id: registro.tenant_id,
          vinculacion: {
            guest_registration_id: registro.id,
            mir_comunicacion_id: comunicacionesMIR.find(c => c.tipo === 'PV')?.id,
            reserva_ref: registro.reserva_ref
          }
        });
      }
      
      // Comunicación RH
      if (comunicacionesMIR.find(c => c.tipo === 'RH') || estadoFromData) {
        comunicacionesParaMostrar.push({
          id: `${registro.id}-RH`,
          timestamp: registro.created_at,
          datos: registro.data,
          nombreCompleto: nombreCompleto,
          referencia: registro.reserva_ref,
          tipo: 'RH',
          lote: loteRH,
          error: comunicacionesMIR.find(c => c.tipo === 'RH')?.error,
          fechaEnvio: comunicacionesMIR.find(c => c.tipo === 'RH')?.created_at,
          estado: estadoRH === 'enviado' ? 'enviado' : estadoRH === 'error' ? 'error' : 'pendiente',
          tenant_id: registro.tenant_id,
          vinculacion: {
            guest_registration_id: registro.id,
            mir_comunicacion_id: comunicacionesMIR.find(c => c.tipo === 'RH')?.id,
            reserva_ref: registro.reserva_ref
          }
        });
      }
      
      // Si no hay comunicaciones MIR pero hay datos en mir_status, crear una comunicación general
      if (comunicacionesParaMostrar.length === 0 && estadoFromData) {
        comunicacionesParaMostrar.push({
          id: registro.id,
          timestamp: registro.created_at,
          datos: registro.data,
          nombreCompleto: nombreCompleto,
          referencia: registro.reserva_ref,
          tipo: 'PV', // Por defecto PV si no hay tipo específico
          lote: loteFromData,
          error: mirStatusFromData.error,
          fechaEnvio: mirStatusFromData.fechaEnvio,
          estado: estadoFromData,
          tenant_id: registro.tenant_id,
          vinculacion: {
            guest_registration_id: registro.id,
            mir_comunicacion_id: null,
            reserva_ref: registro.reserva_ref
          }
        });
      }
      
      // Clasificar cada comunicación según su estado
      comunicacionesParaMostrar.forEach(comunicacion => {
        if (comunicacion.estado === 'error') {
          comunicaciones.errores.push(comunicacion);
          estadisticas.errores++;
        } else if (comunicacion.estado === 'confirmado') {
          comunicaciones.confirmados.push(comunicacion);
          estadisticas.confirmados++;
        } else if (comunicacion.estado === 'enviado') {
          comunicaciones.enviados.push(comunicacion);
          estadisticas.enviados++;
        } else {
          comunicaciones.pendientes.push(comunicacion);
          estadisticas.pendientes++;
        }
      });
    });
    
    estadisticas.total = result.rows.length;
    
    console.log('📈 Estadísticas de envíos:', estadisticas);
    
    return NextResponse.json({
      success: true,
      estadisticas,
      comunicaciones: {
        pendientes: comunicaciones.pendientes,
        enviados: comunicaciones.enviados,
        confirmados: comunicaciones.confirmados,
        errores: comunicaciones.errores
      },
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estado de envíos:', error);
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo estado de envíos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
