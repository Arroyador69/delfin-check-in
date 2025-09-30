import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando el registro más reciente...');
    
    // Obtener el registro más reciente
    const registros = await sql`
      SELECT id, reserva_ref, data, created_at 
      FROM guest_registrations 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    if (registros.length === 0) {
      return NextResponse.json({
        ok: false,
        message: 'No hay registros en la base de datos'
      });
    }
    
    const registro = registros[0];
    const data = registro.data;
    
    console.log('📊 Registro más reciente encontrado:', registro.id);
    console.log('📅 Fecha:', registro.created_at);
    
    // Análisis completo de la estructura
    const analisis = {
      id: registro.id,
      fechaCreacion: registro.created_at,
      referencia: registro.reserva_ref,
      
      // Estructura de nivel superior
      estructuraSuperior: {
        tieneComunicaciones: !!data?.comunicaciones,
        tienePersonas: !!data?.personas,
        tieneViajeros: !!data?.viajeros,
        tieneContrato: !!data?.contrato,
        codigoEstablecimiento: data?.codigoEstablecimiento
      },
      
      // Análisis de comunicaciones
      comunicaciones: data?.comunicaciones ? {
        cantidad: data.comunicaciones.length,
        primeraComunicacion: data.comunicaciones[0] ? {
          tieneContrato: !!data.comunicaciones[0].contrato,
          tienePersonas: !!data.comunicaciones[0].personas,
          tieneViajeros: !!data.comunicaciones[0].viajeros,
          cantidadPersonas: data.comunicaciones[0].personas?.length || 0,
          cantidadViajeros: data.comunicaciones[0].viajeros?.length || 0,
          primeraPersona: data.comunicaciones[0].personas?.[0] || null,
          primerViajero: data.comunicaciones[0].viajeros?.[0] || null
        } : null
      } : null,
      
      // Datos directos
      datosDirectos: {
        personas: data?.personas || [],
        viajeros: data?.viajeros || []
      },
      
      // Estructura completa
      estructuraCompleta: data
    };
    
    return NextResponse.json({
      ok: true,
      analisis,
      mensaje: 'Análisis del registro más reciente completado'
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
