import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🧹 Iniciando limpieza de registros duplicados...');
    
    // Buscar todos los registros con el mismo documento de identidad
    const duplicates = await sql`
      SELECT 
        data->'comunicaciones'->0->'personas'->0->>'numeroDocumento' as documento,
        COUNT(*) as total,
        array_agg(id ORDER BY created_at DESC) as ids,
        array_agg(created_at ORDER BY created_at DESC) as fechas
      FROM guest_registrations 
      WHERE data->'comunicaciones'->0->'personas'->0->>'numeroDocumento' IS NOT NULL
        AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY data->'comunicaciones'->0->'personas'->0->>'numeroDocumento'
      HAVING COUNT(*) > 1
      ORDER BY total DESC
    `;
    
    let totalEliminados = 0;
    let totalDocumentos = 0;
    
    for (const duplicate of duplicates.rows) {
      const documento = duplicate.documento;
      const ids = duplicate.ids;
      const fechas = duplicate.fechas;
      
      console.log(`🔍 Procesando documento ${documento} con ${ids.length} registros`);
      
      // Obtener todos los registros para este documento
      const registros = await sql`
        SELECT id, data, created_at
        FROM guest_registrations 
        WHERE id = ANY(${ids as any})
        ORDER BY created_at DESC
      `;
      
      // Encontrar el registro más completo
      let mejorRegistro = null;
      let mejorPuntuacion = 0;
      
      for (const registro of registros.rows) {
        let puntuacion = 0;
        const persona = registro.data?.comunicaciones?.[0]?.personas?.[0];
        
        // Criterios de completitud
        if (persona?.direccion?.codigoPostal && persona.direccion.codigoPostal !== "00000") puntuacion += 3;
        if (persona?.contacto?.telefono && persona.contacto.telefono !== "600000000") puntuacion += 2;
        if (persona?.contacto?.correo && persona.contacto.correo !== "viajero@example.com") puntuacion += 2;
        if (persona?.direccion?.nombreMunicipio) puntuacion += 1;
        if (persona?.direccion?.codigoMunicipio) puntuacion += 1;
        if (persona?.apellido2) puntuacion += 1;
        
        if (puntuacion > mejorPuntuacion) {
          mejorPuntuacion = puntuacion;
          mejorRegistro = registro;
        }
      }
      
      if (mejorRegistro) {
        console.log(`✅ Mejor registro para ${documento}: ${mejorRegistro.id} (puntuación: ${mejorPuntuacion})`);
        
        // Eliminar todos los registros excepto el mejor
        const idsAEliminar = registros.rows
          .filter(r => r.id !== mejorRegistro.id)
          .map(r => r.id);
        
        if (idsAEliminar.length > 0) {
          await sql`
            DELETE FROM guest_registrations 
            WHERE id = ANY(${idsAEliminar as any})
          `;
          
          totalEliminados += idsAEliminar.length;
          console.log(`🗑️ Eliminados ${idsAEliminar.length} registros duplicados para documento ${documento}`);
        }
      }
      
      totalDocumentos++;
    }
    
    console.log(`✅ Limpieza completada: ${totalEliminados} registros eliminados de ${totalDocumentos} documentos duplicados`);
    
    return NextResponse.json({
      success: true,
      message: `Limpieza completada: ${totalEliminados} registros eliminados de ${totalDocumentos} documentos duplicados`,
      stats: {
        documentosProcesados: totalDocumentos,
        registrosEliminados: totalEliminados
      }
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza de duplicados:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error en limpieza de duplicados',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
