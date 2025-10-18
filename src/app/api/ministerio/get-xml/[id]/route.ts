import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`🔍 Obteniendo XML para comunicación ID: ${id}`);

    // Buscar la comunicación en mir_comunicaciones
    const result = await sql`
      SELECT 
        mc.xml_enviado,
        mc.xml_respuesta,
        mc.referencia,
        gr.data
      FROM mir_comunicaciones mc
      LEFT JOIN guest_registrations gr ON mc.referencia = gr.reserva_ref
      WHERE mc.id = ${id}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Comunicación no encontrada'
      }, { status: 404 });
    }

    const comunicacion = result.rows[0];
    
    // Intentar obtener XML de diferentes fuentes
    let xml = null;
    let tipo = '';

    if (comunicacion.xml_enviado) {
      xml = comunicacion.xml_enviado;
      tipo = 'enviado';
    } else if (comunicacion.xml_respuesta) {
      xml = comunicacion.xml_respuesta;
      tipo = 'respuesta';
    } else if (comunicacion.data && typeof comunicacion.data === 'object') {
      // Buscar XML en los datos JSON
      const data = comunicacion.data as any;
      if (data.xml_enviado) {
        xml = data.xml_enviado;
        tipo = 'enviado_json';
      } else if (data.xml_respuesta) {
        xml = data.xml_respuesta;
        tipo = 'respuesta_json';
      }
    }

    if (!xml) {
      // Generar XML básico si no existe
      xml = `<?xml version="1.0" encoding="UTF-8"?>
<comunicacion>
  <referencia>${comunicacion.referencia}</referencia>
  <tipo>PV</tipo>
  <estado>No hay XML disponible</estado>
  <fecha>${new Date().toISOString()}</fecha>
</comunicacion>`;
      tipo = 'generado';
    }

    console.log(`✅ XML encontrado (${tipo}) para comunicación ${id}`);

    return NextResponse.json({
      success: true,
      xml,
      tipo,
      referencia: comunicacion.referencia
    });

  } catch (error) {
    console.error('❌ Error obteniendo XML:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno obteniendo XML',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

