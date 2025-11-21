import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * Endpoint de diagnóstico para investigar errores en comunicaciones MIR
 * 
 * Uso:
 * GET /api/debug/diagnostico-error-mir?referencia=93db4d01-62d3-4ee4-8679-061db8fac0a5
 * GET /api/debug/diagnostico-error-mir?fecha=2025-11-20
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const referencia = searchParams.get('referencia');
    const fecha = searchParams.get('fecha');
    
    let result;
    
    if (referencia) {
      // Buscar por referencia exacta o parcial
      result = await sql`
        SELECT 
          id,
          referencia,
          tipo,
          estado,
          lote,
          error,
          resultado,
          LEFT(xml_enviado, 500) as xml_enviado_preview,
          LENGTH(xml_enviado) as xml_enviado_length,
          LEFT(xml_respuesta, 500) as xml_respuesta_preview,
          LENGTH(xml_respuesta) as xml_respuesta_length,
          created_at,
          updated_at,
          tenant_id
        FROM mir_comunicaciones
        WHERE referencia LIKE ${`%${referencia}%`}
        ORDER BY created_at DESC
      `;
    } else if (fecha) {
      // Buscar por fecha
      result = await sql`
        SELECT 
          id,
          referencia,
          tipo,
          estado,
          lote,
          error,
          resultado,
          LEFT(xml_enviado, 500) as xml_enviado_preview,
          LENGTH(xml_enviado) as xml_enviado_length,
          LEFT(xml_respuesta, 500) as xml_respuesta_preview,
          LENGTH(xml_respuesta) as xml_respuesta_length,
          created_at,
          updated_at,
          tenant_id
        FROM mir_comunicaciones
        WHERE DATE(created_at) = ${fecha}
        ORDER BY created_at DESC
      `;
    } else {
      // Buscar todos los errores recientes
      result = await sql`
        SELECT 
          id,
          referencia,
          tipo,
          estado,
          lote,
          error,
          resultado,
          LEFT(xml_enviado, 500) as xml_enviado_preview,
          LENGTH(xml_enviado) as xml_enviado_length,
          LEFT(xml_respuesta, 500) as xml_respuesta_preview,
          LENGTH(xml_respuesta) as xml_respuesta_length,
          created_at,
          updated_at,
          tenant_id
        FROM mir_comunicaciones
        WHERE estado = 'error'
        ORDER BY created_at DESC
        LIMIT 20
      `;
    }
    
    // Parsear el campo resultado si existe
    const comunicaciones = result.rows.map(row => {
      let resultadoParsed = null;
      try {
        if (row.resultado) {
          resultadoParsed = typeof row.resultado === 'string' 
            ? JSON.parse(row.resultado) 
            : row.resultado;
        }
      } catch (e) {
        resultadoParsed = { raw: row.resultado };
      }
      
      return {
        id: row.id,
        referencia: row.referencia,
        tipo: row.tipo,
        estado: row.estado,
        lote: row.lote,
        error: row.error,
        resultado: resultadoParsed,
        xml_enviado_preview: row.xml_enviado_preview || row.xml_enviado?.substring(0, 500),
        xml_enviado_length: row.xml_enviado_length || row.xml_enviado?.length || 0,
        xml_respuesta_preview: row.xml_respuesta_preview || row.xml_respuesta?.substring(0, 500),
        xml_respuesta_length: row.xml_respuesta_length || row.xml_respuesta?.length || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
        tenant_id: row.tenant_id
      };
    });
    
    // También buscar la configuración MIR para ver si hay problemas
    let configMIR = null;
    if (comunicaciones.length > 0 && comunicaciones[0].tenant_id) {
      try {
        const configResult = await sql`
          SELECT 
            id,
            propietario_id,
            usuario,
            codigo_arrendador,
            codigo_establecimiento,
            base_url,
            aplicacion,
            simulacion,
            activo,
            created_at,
            updated_at
          FROM mir_configuraciones
          WHERE propietario_id = ${comunicaciones[0].tenant_id}
          ORDER BY updated_at DESC
          LIMIT 1
        `;
        
        if (configResult.rows.length > 0) {
          configMIR = {
            ...configResult.rows[0],
            usuario: configResult.rows[0].usuario ? '***CONFIGURADO***' : null,
            // No mostrar la contraseña
          };
        }
      } catch (e) {
        console.error('Error obteniendo configuración MIR:', e);
      }
    }
    
    return NextResponse.json({
      success: true,
      total: comunicaciones.length,
      comunicaciones,
      configuracion_mir: configMIR,
      diagnostico: comunicaciones.length > 0 ? {
        referencia_buscada: referencia,
        fecha_buscada: fecha,
        errores_encontrados: comunicaciones.filter(c => c.estado === 'error').length,
        errores_con_detalle: comunicaciones.filter(c => c.estado === 'error' && c.error).map(c => ({
          referencia: c.referencia,
          tipo: c.tipo,
          error: c.error,
          codigo_error: c.resultado?.codigo,
          descripcion_error: c.resultado?.descripcion,
          tiene_respuesta_mir: !!c.xml_respuesta_preview
        })),
        posibles_causas: analizarCausas(comunicaciones)
      } : null
    });
    
  } catch (error) {
    console.error('Error en diagnóstico MIR:', error);
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo diagnóstico',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

function analizarCausas(comunicaciones: any[]): string[] {
  const causas: string[] = [];
  
  const errores = comunicaciones.filter(c => c.estado === 'error');
  
  // Verificar errores de conexión
  const erroresConexion = errores.filter(c => 
    c.error?.includes('fetch failed') || 
    c.error?.includes('TIMEOUT') ||
    c.error?.includes('NETWORK_ERROR') ||
    c.error?.includes('connect')
  );
  if (erroresConexion.length > 0) {
    causas.push(`Problemas de conectividad con el servidor MIR (${erroresConexion.length} casos)`);
  }
  
  // Verificar errores HTTP
  const erroresHTTP = errores.filter(c => 
    c.resultado?.codigo?.match(/^[4-5]\d{2}$/) ||
    c.error?.includes('HTTP 4') ||
    c.error?.includes('HTTP 5')
  );
  if (erroresHTTP.length > 0) {
    causas.push(`Errores HTTP del servidor MIR (${erroresHTTP.length} casos) - posible problema de autenticación o configuración`);
  }
  
  // Verificar errores de autenticación
  const erroresAuth = errores.filter(c => 
    c.error?.toLowerCase().includes('unauthorized') ||
    c.error?.toLowerCase().includes('forbidden') ||
    c.error?.toLowerCase().includes('401') ||
    c.error?.toLowerCase().includes('403')
  );
  if (erroresAuth.length > 0) {
    causas.push(`Problemas de autenticación con el MIR (${erroresAuth.length} casos) - revisar credenciales`);
  }
  
  // Verificar errores de validación XML
  const erroresXML = errores.filter(c => 
    c.error?.toLowerCase().includes('xml') ||
    c.error?.toLowerCase().includes('validation') ||
    c.error?.toLowerCase().includes('schema')
  );
  if (erroresXML.length > 0) {
    causas.push(`Errores de validación XML (${erroresXML.length} casos) - posible problema en los datos enviados`);
  }
  
  // Verificar si no hay respuesta del MIR
  const sinRespuesta = errores.filter(c => !c.xml_respuesta_preview && !c.resultado);
  if (sinRespuesta.length > 0) {
    causas.push(`Comunicaciones sin respuesta del MIR (${sinRespuesta.length} casos) - posible timeout o caída del servicio`);
  }
  
  // Verificar errores genéricos
  if (causas.length === 0 && errores.length > 0) {
    causas.push(`Errores desconocidos - revisar logs del servidor para más detalles`);
  }
  
  return causas;
}

