import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { denyDebugApiInProduction } from '@/lib/security-deployment';

export async function GET(req: NextRequest) {
  const denied = denyDebugApiInProduction();
  if (denied) return denied;

  try {
    console.log('🔍 Iniciando auditoría exhaustiva de comunicaciones MIR...');

    // 1. Obtener todas las comunicaciones de mir_comunicaciones
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

    // 2. Obtener todos los registros de guest_registrations con mir_status
    const guestRegistrations = await sql`
      SELECT 
        id,
        created_at,
        reserva_ref,
        data,
        fecha_entrada,
        fecha_salida
      FROM guest_registrations 
      WHERE data->'mir_status' IS NOT NULL
      ORDER BY created_at DESC
    `;

    // 3. Procesar datos para auditoría
    const auditoria = {
      resumen: {
        totalMirComunicaciones: mirComunicaciones.rows.length,
        totalGuestRegistrationsConMirStatus: guestRegistrations.rows.length,
        comunicacionesPorTipo: {},
        comunicacionesPorEstado: {},
        lotesUnicos: new Set(),
        referenciasUnicas: new Set()
      },
      detalles: {
        mirComunicaciones: [],
        guestRegistrationsConMirStatus: [],
        inconsistencias: [],
        comunicacionesEnviadas: []
      }
    };

    // Procesar mir_comunicaciones
    mirComunicaciones.rows.forEach(comunicacion => {
      const tipo = comunicacion.tipo || 'desconocido';
      const estado = comunicacion.estado || 'desconocido';
      
      // Contar por tipo
      auditoria.resumen.comunicacionesPorTipo[tipo] = 
        (auditoria.resumen.comunicacionesPorTipo[tipo] || 0) + 1;
      
      // Contar por estado
      auditoria.resumen.comunicacionesPorEstado[estado] = 
        (auditoria.resumen.comunicacionesPorEstado[estado] || 0) + 1;
      
      // Agregar lotes únicos
      if (comunicacion.lote) {
        auditoria.resumen.lotesUnicos.add(comunicacion.lote);
      }
      
      // Agregar referencias únicas
      auditoria.resumen.referenciasUnicas.add(comunicacion.referencia);
      
      const detalle = {
        id: comunicacion.id,
        referencia: comunicacion.referencia,
        tipo: comunicacion.tipo,
        estado: comunicacion.estado,
        lote: comunicacion.lote,
        error: comunicacion.error,
        created_at: comunicacion.created_at,
        updated_at: comunicacion.updated_at,
        resultado: comunicacion.resultado ? JSON.parse(comunicacion.resultado) : null
      };
      
      auditoria.detalles.mirComunicaciones.push(detalle);
      
      // Si está enviado, agregar a comunicaciones enviadas
      if (comunicacion.estado === 'enviado' || comunicacion.lote) {
        auditoria.detalles.comunicacionesEnviadas.push(detalle);
      }
    });

    // Procesar guest_registrations con mir_status
    guestRegistrations.rows.forEach(registro => {
      const mirStatus = registro.data?.mir_status || {};
      
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

      const detalle = {
        id: registro.id,
        reserva_ref: registro.reserva_ref,
        nombreCompleto,
        created_at: registro.created_at,
        fecha_entrada: registro.fecha_entrada,
        fecha_salida: registro.fecha_salida,
        mirStatus: mirStatus,
        estado: mirStatus.estado || 'sin_estado',
        lote: mirStatus.lote || null,
        error: mirStatus.error || null,
        fechaEnvio: mirStatus.fechaEnvio || null
      };

      auditoria.detalles.guestRegistrationsConMirStatus.push(detalle);
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

    // Convertir Sets a Arrays para JSON
    auditoria.resumen.lotesUnicos = Array.from(auditoria.resumen.lotesUnicos);
    auditoria.resumen.referenciasUnicas = Array.from(auditoria.resumen.referenciasUnicas);

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













