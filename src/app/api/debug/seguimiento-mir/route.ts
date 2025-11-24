import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * Endpoint de seguimiento en tiempo real de una comunicación MIR
 * Monitorea todo el flujo desde el envío del formulario hasta mir_comunicaciones
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const reservaRef = searchParams.get('reserva_ref');
    const guestId = searchParams.get('guest_id');
    const tenantId = searchParams.get('tenant_id') || '870e589f-d313-4a5a-901f-f25fd4e7240a';
    
    if (!reservaRef && !guestId) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere reserva_ref o guest_id'
      }, { status: 400 });
    }
    
    console.log('🔍 SEGUIMIENTO MIR - Iniciando...');
    console.log('Reserva Ref:', reservaRef);
    console.log('Guest ID:', guestId);
    console.log('Tenant ID:', tenantId);
    
    const seguimiento: any = {
      timestamp: new Date().toISOString(),
      reserva_ref: reservaRef,
      guest_id: guestId,
      tenant_id: tenantId,
      pasos: {}
    };
    
    // PASO 1: Verificar si existe en guest_registrations
    try {
      const guestReg = guestId
        ? await sql`
            SELECT 
              id,
              reserva_ref,
              tenant_id,
              created_at,
              comunicacion_id,
              fecha_entrada,
              fecha_salida,
              data->'mir_status' as mir_status,
              data->'comunicaciones' as comunicaciones_data
            FROM guest_registrations
            WHERE id = ${guestId}
            LIMIT 1
          `
        : await sql`
            SELECT 
              id,
              reserva_ref,
              tenant_id,
              created_at,
              comunicacion_id,
              fecha_entrada,
              fecha_salida,
              data->'mir_status' as mir_status,
              data->'comunicaciones' as comunicaciones_data
            FROM guest_registrations
            WHERE reserva_ref = ${reservaRef}
              AND tenant_id = ${tenantId}
            ORDER BY created_at DESC
            LIMIT 1
          `;
      
      if (guestReg.rows.length === 0) {
        seguimiento.pasos.paso1_guest_registration = {
          estado: 'NO_ENCONTRADO',
          mensaje: 'El registro no existe en guest_registrations',
          recomendacion: 'Verificar que el formulario se envió correctamente'
        };
      } else {
        const reg = guestReg.rows[0];
        seguimiento.pasos.paso1_guest_registration = {
          estado: 'OK',
          registro: {
            id: reg.id,
            reserva_ref: reg.reserva_ref,
            tenant_id: reg.tenant_id,
            created_at: reg.created_at,
            comunicacion_id: reg.comunicacion_id,
            tiene_mir_status: !!reg.mir_status,
            mir_status: reg.mir_status
          }
        };
        
        // Actualizar guest_id si no estaba
        if (!guestId && reg.id) {
          seguimiento.guest_id = reg.id;
        }
      }
    } catch (error) {
      seguimiento.pasos.paso1_guest_registration = {
        estado: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    // PASO 2: Verificar si hay comunicaciones en mir_comunicaciones para PV
    try {
      const referenciaPV = reservaRef ? `${reservaRef}-PV` : null;
      const mirPV = referenciaPV
        ? await sql`
            SELECT 
              id,
              referencia,
              tipo,
              estado,
              tenant_id,
              created_at,
              lote,
              error,
              resultado
            FROM mir_comunicaciones
            WHERE referencia = ${referenciaPV}
            ORDER BY created_at DESC
            LIMIT 1
          `
        : { rows: [] };
      
      seguimiento.pasos.paso2_mir_comunicacion_pv = {
        estado: mirPV.rows.length > 0 ? 'ENCONTRADO' : 'NO_ENCONTRADO',
        referencia_buscada: referenciaPV,
        registro: mirPV.rows[0] || null
      };
    } catch (error) {
      seguimiento.pasos.paso2_mir_comunicacion_pv = {
        estado: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    // PASO 3: Verificar si hay comunicaciones en mir_comunicaciones para RH
    try {
      const referenciaRH = reservaRef ? `${reservaRef}-RH` : null;
      const mirRH = referenciaRH
        ? await sql`
            SELECT 
              id,
              referencia,
              tipo,
              estado,
              tenant_id,
              created_at,
              lote,
              error,
              resultado
            FROM mir_comunicaciones
            WHERE referencia = ${referenciaRH}
            ORDER BY created_at DESC
            LIMIT 1
          `
        : { rows: [] };
      
      seguimiento.pasos.paso3_mir_comunicacion_rh = {
        estado: mirRH.rows.length > 0 ? 'ENCONTRADO' : 'NO_ENCONTRADO',
        referencia_buscada: referenciaRH,
        registro: mirRH.rows[0] || null
      };
    } catch (error) {
      seguimiento.pasos.paso3_mir_comunicacion_rh = {
        estado: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    // PASO 4: Verificar si hay comunicaciones con LIKE (por si la referencia es diferente)
    try {
      const mirLike = reservaRef
        ? await sql`
            SELECT 
              id,
              referencia,
              tipo,
              estado,
              tenant_id,
              created_at,
              lote,
              error
            FROM mir_comunicaciones
            WHERE referencia LIKE ${reservaRef + '%'}
              AND tenant_id = ${tenantId}
            ORDER BY created_at DESC
            LIMIT 10
          `
        : { rows: [] };
      
      seguimiento.pasos.paso4_mir_comunicaciones_like = {
        estado: mirLike.rows.length > 0 ? 'ENCONTRADAS' : 'NO_ENCONTRADAS',
        patron_buscado: reservaRef ? `${reservaRef}%` : null,
        encontradas: mirLike.rows.length,
        registros: mirLike.rows
      };
    } catch (error) {
      seguimiento.pasos.paso4_mir_comunicaciones_like = {
        estado: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    // PASO 5: Verificar configuración MIR del tenant
    try {
      const mirConfig = await sql`
        SELECT 
          id,
          propietario_id,
          activo,
          codigo_establecimiento,
          codigo_arrendador
        FROM mir_configuraciones
        WHERE propietario_id = ${tenantId}
        LIMIT 1
      `;
      
      seguimiento.pasos.paso5_mir_configuracion = {
        estado: mirConfig.rows.length > 0 ? 'ENCONTRADA' : 'NO_ENCONTRADA',
        config: mirConfig.rows[0] || null
      };
    } catch (error) {
      seguimiento.pasos.paso5_mir_configuracion = {
        estado: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    // PASO 6: Verificar RLS en mir_comunicaciones
    try {
      const rlsEnabled = await sql`
        SELECT relname, relrowsecurity
        FROM pg_class
        WHERE relname = 'mir_comunicaciones'
      `;
      
      const rlsPolicies = await sql`
        SELECT policyname, qual, with_check
        FROM pg_policies
        WHERE tablename = 'mir_comunicaciones'
      `;
      
      seguimiento.pasos.paso6_rls = {
        rls_habilitado: rlsEnabled.rows[0]?.relrowsecurity || false,
        politicas: rlsPolicies.rows.length,
        detalles_politicas: rlsPolicies.rows
      };
    } catch (error) {
      seguimiento.pasos.paso6_rls = {
        estado: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    // ANÁLISIS FINAL
    const analisis = {
      flujo_completo: false,
      punto_fallo: '',
      recomendaciones: [] as string[]
    };
    
    // Verificar flujo completo
    const paso1OK = seguimiento.pasos.paso1_guest_registration?.estado === 'OK';
    const paso2OK = seguimiento.pasos.paso2_mir_comunicacion_pv?.estado === 'ENCONTRADO';
    const paso3OK = seguimiento.pasos.paso3_mir_comunicacion_rh?.estado === 'ENCONTRADO';
    
    if (!paso1OK) {
      analisis.punto_fallo = 'PASO 1: No se encontró el registro en guest_registrations';
      analisis.recomendaciones.push('Verificar que el formulario se envió correctamente');
      analisis.recomendaciones.push('Revisar logs del endpoint /api/public/form/[slug]/submit');
    } else if (!paso2OK && !paso3OK) {
      analisis.punto_fallo = 'PASO 2-3: No se encontraron comunicaciones en mir_comunicaciones';
      analisis.recomendaciones.push('El endpoint dual (/api/ministerio/auto-envio-dual) no se ejecutó o falló');
      analisis.recomendaciones.push('Revisar logs de Vercel para ver si hay errores en el endpoint dual');
      analisis.recomendaciones.push('Verificar que insertMirComunicacion está insertando correctamente');
      
      // Verificar si hay comunicaciones con LIKE
      if (seguimiento.pasos.paso4_mir_comunicaciones_like?.encontradas > 0) {
        analisis.recomendaciones.push('Hay comunicaciones con referencia similar - verificar formato de referencia');
      }
    } else if (!paso2OK) {
      analisis.punto_fallo = 'PASO 2: No se encontró comunicación PV en mir_comunicaciones';
      analisis.recomendaciones.push('El envío PV falló o no se guardó');
    } else if (!paso3OK) {
      analisis.punto_fallo = 'PASO 3: No se encontró comunicación RH en mir_comunicaciones';
      analisis.recomendaciones.push('El envío RH falló o no se guardó');
    } else {
      analisis.flujo_completo = true;
      analisis.punto_fallo = 'NINGUNO - Flujo completo';
    }
    
    // Verificar RLS
    if (seguimiento.pasos.paso6_rls?.rls_habilitado) {
      if (!paso2OK || !paso3OK) {
        analisis.recomendaciones.push('RLS está habilitado - verificar que las políticas permiten la inserción/lectura');
        analisis.recomendaciones.push('Verificar que tenant_id se está insertando correctamente en mir_comunicaciones');
      }
    }
    
    seguimiento.analisis = analisis;
    
    return NextResponse.json({
      success: true,
      seguimiento
    });
    
  } catch (error) {
    console.error('❌ Error en seguimiento:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

