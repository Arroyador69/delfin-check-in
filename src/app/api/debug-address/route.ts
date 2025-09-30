import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Debug: Verificando datos de dirección...');
    
    // Obtener algunos registros de ejemplo
    const registros = await sql`
      SELECT id, reserva_ref, data, created_at 
      FROM guest_registrations 
      ORDER BY created_at DESC 
      LIMIT 3
    `;
    
    console.log(`📊 Encontrados ${registros.length} registros`);
    
    const debugInfo = registros.map((registro, index) => {
      const data = registro.data;
      
      // Función helper para extraer datos del viajero (igual que en el dashboard)
      const personas = data?.comunicaciones?.[0]?.personas?.[0] || 
                      data?.comunicaciones?.[0]?.viajeros?.[0] ||
                      data?.personas?.[0] ||
                      data?.viajeros?.[0] ||
                      {};
      
      const direccionData = personas.direccion || {};
      
      return {
        registroId: registro.id,
        fechaCreacion: registro.created_at,
        referencia: registro.reserva_ref,
        datosPersona: {
          nombre: personas.nombre || 'N/A',
          apellido1: personas.apellido1 || 'N/A',
          telefono: personas.telefono || 'N/A',
          correo: personas.correo || 'N/A',
          direccion: {
            direccion: direccionData.direccion || 'N/A',
            codigoPostal: direccionData.codigoPostal || 'N/A',
            pais: direccionData.pais || 'N/A',
            nombreMunicipio: direccionData.nombreMunicipio || 'N/A',
            codigoMunicipio: direccionData.codigoMunicipio || 'N/A'
          }
        },
        estructuraCompleta: data
      };
    });
    
    return NextResponse.json({
      ok: true,
      totalRegistros: registros.length,
      debugInfo: debugInfo,
      mensaje: 'Datos de debug obtenidos correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
