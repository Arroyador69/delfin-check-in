import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Iniciando auditoría exhaustiva de comunicaciones MIR...');

    // 1. Obtener todos los registros de guest_registrations
    const guestRegistrations = await sql`
      SELECT 
        id,
        created_at,
        reserva_ref,
        data,
        fecha_entrada,
        fecha_salida
      FROM guest_registrations 
      ORDER BY created_at DESC
    `;

    // 2. Obtener todas las comunicaciones de mir_comunicaciones
    const mirComunicaciones = await sql`
      SELECT 
        id,
        referencia,
        tipo,
        estado,
        lote,
        resultado,
        error,
        created_at,
        updated_at
      FROM mir_comunicaciones 
      ORDER BY created_at DESC
    `;

    // 3. Procesar datos para auditoría
    const auditoria = {
      resumen: {
        totalGuestRegistrations: guestRegistrations.rows.length,
        totalMirComunicaciones: mirComunicaciones.rows.length,
        registrosConMirStatus: 0,
        registrosSinMirStatus: 0,
        comunicacionesEnviadas: 0,
        comunicacionesPendientes: 0,
        comunicacionesConError: 0
      },
      detalles: {
        guestRegistrations: [],
        mirComunicaciones: [],
        inconsistencias: []
      }
    };

    // Procesar guest_registrations
    guestRegistrations.rows.forEach(registro => {
      const mirStatus = registro.data?.mir_status || {};
      const tieneMirStatus = Object.keys(mirStatus).length > 0;
      
      if (tieneMirStatus) {
        auditoria.resumen.registrosConMirStatus++;
      } else {
        auditoria.resumen.registrosSinMirStatus++;
      }

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

      const registroDetalle = {
        id: registro.id,
        reserva_ref: registro.reserva_ref,
        nombreCompleto,
        created_at: registro.created_at,
        fecha_entrada: registro.fecha_entrada,
        fecha_salida: registro.fecha_salida,
        tieneMirStatus,
        mirStatus: mirStatus,
        estado: mirStatus.estado || 'sin_estado',
        lote: mirStatus.lote || null,
        error: mirStatus.error || null
      };

      auditoria.detalles.guestRegistrations.push(registroDetalle);

      // Clasificar por estado
      if (mirStatus.estado === 'enviado' || mirStatus.lote) {
        auditoria.resumen.comunicacionesEnviadas++;
      } else if (mirStatus.estado === 'error') {
        auditoria.resumen.comunicacionesConError++;
      } else {
        auditoria.resumen.comunicacionesPendientes++;
      }
    });

    // Procesar mir_comunicaciones
    mirComunicaciones.rows.forEach(comunicacion => {
      const comunicacionDetalle = {
        id: comunicacion.id,
        referencia: comunicacion.referencia,
        tipo: comunicacion.tipo,
        estado: comunicacion.estado,
        lote: comunicacion.lote,
        error: comunicacion.error,
        created_at: comunicacion.created_at,
        updated_at: comunicacion.updated_at
      };

      auditoria.detalles.mirComunicaciones.push(comunicacionDetalle);
    });

    // Buscar inconsistencias
    guestRegistrations.rows.forEach(registro => {
      const mirStatus = registro.data?.mir_status || {};
      const referencia = registro.reserva_ref;
      
      // Buscar si existe en mir_comunicaciones
      const existeEnMirComunicaciones = mirComunicaciones.rows.find(mc => mc.referencia === referencia);
      
      if (mirStatus.estado === 'enviado' && !existeEnMirComunicaciones) {
        auditoria.detalles.inconsistencias.push({
          tipo: 'enviado_sin_mir_comunicacion',
          referencia,
          descripcion: `Registro marcado como enviado en guest_registrations pero no existe en mir_comunicaciones`,
          guestRegistrations: {
            estado: mirStatus.estado,
            lote: mirStatus.lote,
            fechaEnvio: mirStatus.fechaEnvio
          },
          mirComunicaciones: null
        });
      }
      
      if (existeEnMirComunicaciones && !mirStatus.estado) {
        auditoria.detalles.inconsistencias.push({
          tipo: 'mir_comunicacion_sin_estado',
          referencia,
          descripcion: `Existe en mir_comunicaciones pero no tiene estado en guest_registrations`,
          guestRegistrations: {
            estado: null,
            lote: null
          },
          mirComunicaciones: {
            estado: existeEnMirComunicaciones.estado,
            lote: existeEnMirComunicaciones.lote,
            tipo: existeEnMirComunicaciones.tipo
          }
        });
      }
    });

    console.log('📊 Auditoría completada:', auditoria.resumen);

    return NextResponse.json({
      success: true,
      auditoria,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    return NextResponse.json({
      success: false,
      error: 'Error realizando auditoría',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}













