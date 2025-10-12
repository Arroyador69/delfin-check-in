import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 AUDITORÍA ESPECÍFICA: Buscando registro de Pablo...');
    
    // Buscar registros que contengan "Pablo" en el nombre
    const registros = await sql`
      SELECT 
        id,
        created_at,
        fecha_entrada,
        fecha_salida,
        data,
        reserva_ref
      FROM guest_registrations 
      WHERE data::text ILIKE '%Pablo%'
      ORDER BY created_at DESC
    `;
    
    console.log(`📊 Encontrados ${registros.rows.length} registros con "Pablo"`);
    
    if (registros.rows.length === 0) {
      // Si no encontramos por nombre, buscar los últimos registros
      const ultimosRegistros = await sql`
        SELECT 
          id,
          created_at,
          fecha_entrada,
          fecha_salida,
          data,
          reserva_ref
        FROM guest_registrations 
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      return NextResponse.json({
        success: true,
        mensaje: 'No se encontraron registros con "Pablo"',
        ultimosRegistros: ultimosRegistros.rows.map(reg => ({
          id: reg.id,
          fecha: reg.created_at,
          nombre: reg.data?.comunicaciones?.[0]?.personas?.[0]?.nombre || 'Sin nombre',
          apellido1: reg.data?.comunicaciones?.[0]?.personas?.[0]?.apellido1 || 'Sin apellido',
          mirStatus: reg.data?.mir_status || null
        }))
      });
    }
    
    // Analizar cada registro encontrado
    const analisis = registros.rows.map(registro => {
      const data = registro.data;
      const mirStatus = data?.mir_status || {};
      
      // Extraer datos del viajero
      const persona = data?.comunicaciones?.[0]?.personas?.[0] || {};
      const direccion = persona.direccion || {};
      
      return {
        id: registro.id,
        fechaCreacion: registro.created_at,
        fechaEntrada: registro.fecha_entrada,
        fechaSalida: registro.fecha_salida,
        referencia: registro.reserva_ref,
        
        // Datos del viajero
        viajero: {
          nombre: persona.nombre,
          apellido1: persona.apellido1,
          apellido2: persona.apellido2,
          tipoDocumento: persona.tipoDocumento,
          numeroDocumento: persona.numeroDocumento,
          nacionalidad: persona.nacionalidad,
          fechaNacimiento: persona.fechaNacimiento
        },
        
        // Dirección
        direccion: {
          direccion: direccion.direccion,
          codigoPostal: direccion.codigoPostal,
          pais: direccion.pais,
          codigoMunicipio: direccion.codigoMunicipio,
          nombreMunicipio: direccion.nombreMunicipio
        },
        
        // Estado del MIR
        mirStatus: {
          tieneEstado: !!mirStatus.lote || !!mirStatus.error || !!mirStatus.codigoComunicacion,
          lote: mirStatus.lote,
          codigoComunicacion: mirStatus.codigoComunicacion,
          error: mirStatus.error,
          fechaEnvio: mirStatus.fechaEnvio,
          estado: mirStatus.estado
        },
        
        // Análisis de por qué está pendiente
        analisis: {
          razonPendiente: !mirStatus.lote && !mirStatus.error && !mirStatus.codigoComunicacion 
            ? 'No se ha enviado al MIR' 
            : mirStatus.error 
            ? `Error: ${mirStatus.error}` 
            : mirStatus.lote && !mirStatus.codigoComunicacion 
            ? 'Enviado pero pendiente de confirmación' 
            : 'Enviado y confirmado',
          
          tieneDatosCompletos: !!(persona.nombre && persona.apellido1 && persona.fechaNacimiento),
          tieneDireccionCompleta: !!(direccion.direccion && direccion.codigoPostal && direccion.pais),
          tieneMunicipioCorrecto: direccion.pais === 'ESP' 
            ? !!direccion.codigoMunicipio 
            : !!direccion.nombreMunicipio
        }
      };
    });
    
    return NextResponse.json({
      success: true,
      totalRegistros: registros.rows.length,
      registros: analisis,
      resumen: {
        pendientes: analisis.filter(r => !r.mirStatus.tieneEstado).length,
        conError: analisis.filter(r => r.mirStatus.error).length,
        enviados: analisis.filter(r => r.mirStatus.lote && !r.mirStatus.codigoComunicacion).length,
        confirmados: analisis.filter(r => r.mirStatus.codigoComunicacion).length
      }
    });
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en auditoría',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

