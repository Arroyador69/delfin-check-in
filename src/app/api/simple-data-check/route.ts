import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 VERIFICACIÓN SIMPLE: Iniciando...');
    
    // Obtener todos los registros
    const registrations = await sql`
      SELECT id, created_at, viajero, data 
      FROM guest_registrations 
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log(`📊 Registros encontrados: ${registrations.rows?.length || 0}`);
    
    // Análisis simple de cada registro
    const results = registrations.rows?.map((reg, index) => {
      const data = reg.data;
      
      // Buscar datos de dirección en la estructura más común
      const persona = data?.comunicaciones?.[0]?.personas?.[0];
      const direccion = persona?.direccion;
      
      return {
        id: reg.id,
        fecha: reg.created_at,
        viajero: reg.viajero?.nombre || 'Sin nombre',
        tienePersona: !!persona,
        tieneDireccion: !!direccion,
        direccion: direccion || null,
        personaCompleta: persona || null,
        dataCompleta: data
      };
    }) || [];
    
    return NextResponse.json({
      total: registrations.rows?.length || 0,
      registros: results,
      mensaje: 'Verificación simple completada'
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      error: 'Error al verificar datos',
      detalles: error.message
    }, { status: 500 });
  }
}
