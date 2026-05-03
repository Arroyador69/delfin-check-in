import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { denyDebugApiInProduction } from '@/lib/security-deployment';

/**
 * Endpoint de diagnóstico para verificar por qué las comunicaciones MIR no aparecen
 * Verifica:
 * 1. Si hay registros en mir_comunicaciones para el tenant
 * 2. Si RLS está bloqueando las consultas
 * 3. Si el endpoint dual se está ejecutando
 */
export async function GET(req: NextRequest) {
  const denied = denyDebugApiInProduction();
  if (denied) return denied;

  try {
    const searchParams = req.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id') || '870e589f-d313-4a5a-901f-f25fd4e7240a';
    const reservaRef = searchParams.get('reserva_ref') || '0000146967';
    
    console.log('🔍 DIAGNÓSTICO MIR - Iniciando...');
    console.log('Tenant ID:', tenantId);
    console.log('Reserva Ref:', reservaRef);
    
    const diagnosticos: any = {
      timestamp: new Date().toISOString(),
      tenant_id: tenantId,
      reserva_ref: reservaRef,
      resultados: {}
    };
    
    // 1. Verificar si hay registros en guest_registrations
    try {
      const guestRegs = await sql`
        SELECT 
          id,
          reserva_ref,
          tenant_id,
          created_at,
          comunicacion_id,
          data->'mir_status' as mir_status
        FROM guest_registrations
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      diagnosticos.resultados.guest_registrations = {
        encontrados: guestRegs.rows.length,
        registros: guestRegs.rows.map(r => ({
          id: r.id,
          reserva_ref: r.reserva_ref,
          tenant_id: r.tenant_id,
          created_at: r.created_at,
          comunicacion_id: r.comunicacion_id,
          tiene_mir_status: !!r.mir_status
        }))
      };
      
      console.log('✅ Guest registrations encontrados:', guestRegs.rows.length);
    } catch (error) {
      diagnosticos.resultados.guest_registrations = {
        error: error instanceof Error ? error.message : String(error)
      };
      console.error('❌ Error consultando guest_registrations:', error);
    }
    
    // 2. Verificar si hay registros en mir_comunicaciones SIN filtro de tenant (para ver si RLS bloquea)
    try {
      const mirComunicacionesSinFiltro = await sql`
        SELECT 
          id,
          referencia,
          tipo,
          estado,
          tenant_id,
          created_at,
          error
        FROM mir_comunicaciones
        WHERE referencia LIKE ${reservaRef + '%'}
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      diagnosticos.resultados.mir_comunicaciones_sin_filtro_tenant = {
        encontrados: mirComunicacionesSinFiltro.rows.length,
        registros: mirComunicacionesSinFiltro.rows
      };
      
      console.log('✅ Mir comunicaciones (sin filtro tenant):', mirComunicacionesSinFiltro.rows.length);
    } catch (error) {
      diagnosticos.resultados.mir_comunicaciones_sin_filtro_tenant = {
        error: error instanceof Error ? error.message : String(error)
      };
      console.error('❌ Error consultando mir_comunicaciones (sin filtro):', error);
    }
    
    // 3. Verificar si hay registros en mir_comunicaciones CON filtro de tenant
    try {
      const mirComunicacionesConFiltro = await sql`
        SELECT 
          id,
          referencia,
          tipo,
          estado,
          tenant_id,
          created_at,
          error
        FROM mir_comunicaciones
        WHERE tenant_id = ${tenantId}
          AND referencia LIKE ${reservaRef + '%'}
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      diagnosticos.resultados.mir_comunicaciones_con_filtro_tenant = {
        encontrados: mirComunicacionesConFiltro.rows.length,
        registros: mirComunicacionesConFiltro.rows
      };
      
      console.log('✅ Mir comunicaciones (con filtro tenant):', mirComunicacionesConFiltro.rows.length);
    } catch (error) {
      diagnosticos.resultados.mir_comunicaciones_con_filtro_tenant = {
        error: error instanceof Error ? error.message : String(error)
      };
      console.error('❌ Error consultando mir_comunicaciones (con filtro):', error);
    }
    
    // 4. Verificar si hay registros en mir_comunicaciones SIN tenant_id (NULL)
    try {
      const mirComunicacionesSinTenant = await sql`
        SELECT 
          id,
          referencia,
          tipo,
          estado,
          tenant_id,
          created_at,
          error
        FROM mir_comunicaciones
        WHERE tenant_id IS NULL
          AND referencia LIKE ${reservaRef + '%'}
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      diagnosticos.resultados.mir_comunicaciones_sin_tenant_id = {
        encontrados: mirComunicacionesSinTenant.rows.length,
        registros: mirComunicacionesSinTenant.rows
      };
      
      console.log('✅ Mir comunicaciones (sin tenant_id):', mirComunicacionesSinTenant.rows.length);
    } catch (error) {
      diagnosticos.resultados.mir_comunicaciones_sin_tenant_id = {
        error: error instanceof Error ? error.message : String(error)
      };
      console.error('❌ Error consultando mir_comunicaciones (sin tenant_id):', error);
    }
    
    // 5. Verificar RLS en mir_comunicaciones
    try {
      const rlsStatus = await sql`
        SELECT 
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE tablename = 'mir_comunicaciones'
      `;
      
      diagnosticos.resultados.rls_policies = {
        encontradas: rlsStatus.rows.length,
        policies: rlsStatus.rows
      };
      
      // Verificar si RLS está habilitado
      const rlsEnabled = await sql`
        SELECT relname, relrowsecurity
        FROM pg_class
        WHERE relname = 'mir_comunicaciones'
      `;
      
      diagnosticos.resultados.rls_enabled = rlsEnabled.rows[0]?.relrowsecurity || false;
      
      console.log('✅ RLS status:', {
        enabled: diagnosticos.resultados.rls_enabled,
        policies: rlsStatus.rows.length
      });
    } catch (error) {
      diagnosticos.resultados.rls_status = {
        error: error instanceof Error ? error.message : String(error)
      };
      console.error('❌ Error consultando RLS:', error);
    }
    
    // 6. Verificar la consulta que usa la página de estados
    try {
      const estadoEnviosQuery = await sql`
        SELECT 
          gr.id,
          gr.reserva_ref,
          gr.tenant_id,
          mc.id as mir_id,
          mc.referencia as mir_referencia,
          mc.tipo as mir_tipo,
          mc.estado as mir_estado,
          mc.tenant_id as mir_tenant_id
        FROM guest_registrations gr
        LEFT JOIN mir_comunicaciones mc ON (
          gr.comunicacion_id = mc.referencia OR 
          gr.reserva_ref = mc.referencia OR
          mc.referencia LIKE gr.reserva_ref || '%'
        )
        WHERE gr.tenant_id = ${tenantId}
        ORDER BY gr.created_at DESC
        LIMIT 5
      `;
      
      diagnosticos.resultados.consulta_estado_envios = {
        encontrados: estadoEnviosQuery.rows.length,
        registros: estadoEnviosQuery.rows
      };
      
      console.log('✅ Consulta estado-envios:', estadoEnviosQuery.rows.length);
    } catch (error) {
      diagnosticos.resultados.consulta_estado_envios = {
        error: error instanceof Error ? error.message : String(error)
      };
      console.error('❌ Error en consulta estado-envios:', error);
    }
    
    // 7. Verificar configuración MIR del tenant
    try {
      const mirConfig = await sql`
        SELECT 
          id,
          propietario_id,
          activo,
          codigo_establecimiento
        FROM mir_configuraciones
        WHERE propietario_id = ${tenantId}
        LIMIT 1
      `;
      
      diagnosticos.resultados.mir_configuracion = {
        encontrada: mirConfig.rows.length > 0,
        config: mirConfig.rows[0] || null
      };
      
      console.log('✅ Configuración MIR:', mirConfig.rows.length > 0 ? 'Encontrada' : 'No encontrada');
    } catch (error) {
      diagnosticos.resultados.mir_configuracion = {
        error: error instanceof Error ? error.message : String(error)
      };
      console.error('❌ Error consultando mir_configuraciones:', error);
    }
    
    // Análisis final
    const analisis = {
      problema_detectado: '',
      recomendaciones: [] as string[]
    };
    
    if (diagnosticos.resultados.mir_comunicaciones_con_filtro_tenant?.encontrados === 0) {
      if (diagnosticos.resultados.mir_comunicaciones_sin_filtro_tenant?.encontrados > 0) {
        analisis.problema_detectado = 'RLS está bloqueando las consultas - hay registros sin tenant_id o con tenant_id diferente';
        analisis.recomendaciones.push('Verificar que insertMirComunicacion está insertando el tenant_id correctamente');
        analisis.recomendaciones.push('Verificar que los registros antiguos tienen tenant_id asignado');
      } else if (diagnosticos.resultados.mir_comunicaciones_sin_tenant_id?.encontrados > 0) {
        analisis.problema_detectado = 'Hay registros sin tenant_id - RLS puede estar bloqueando';
        analisis.recomendaciones.push('Actualizar registros sin tenant_id con el tenant_id correcto');
      } else {
        analisis.problema_detectado = 'No hay registros en mir_comunicaciones - el endpoint dual no se está ejecutando o falla silenciosamente';
        analisis.recomendaciones.push('Verificar logs del servidor en Vercel para ver si el endpoint dual se ejecuta');
        analisis.recomendaciones.push('Verificar que el endpoint dual está guardando correctamente en mir_comunicaciones');
      }
    } else {
      analisis.problema_detectado = 'Hay registros pero no aparecen en la página - problema en la consulta o en el frontend';
      analisis.recomendaciones.push('Verificar la consulta en /api/ministerio/estado-envios');
      analisis.recomendaciones.push('Verificar que el frontend está filtrando correctamente por tenant_id');
    }
    
    diagnosticos.analisis = analisis;
    
    return NextResponse.json({
      success: true,
      diagnostico: diagnosticos
    });
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

