import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test simple MIR...');
    
    const json = await req.json().catch(() => ({}));
    const { registroId } = json;
    
    if (!registroId) {
      return NextResponse.json({
        success: false,
        error: 'ID de registro requerido'
      }, { status: 400 });
    }
    
    // Obtener el registro específico
    const result = await sql`
      SELECT 
        id,
        created_at,
        fecha_entrada,
        fecha_salida,
        data,
        reserva_ref
      FROM guest_registrations 
      WHERE id = ${registroId}
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Registro no encontrado'
      }, { status: 404 });
    }
    
    const row = result.rows[0];
    const data = row.data || {};
    
    // Extraer datos de la persona desde la estructura correcta
    const persona = data.comunicaciones?.[0]?.personas?.[0] || {};
    
    console.log('📋 Datos extraídos:', {
      nombre: persona.nombre,
      apellido1: persona.apellido1,
      apellido2: persona.apellido2,
      telefono: persona.telefono,
      correo: persona.correo,
      pais: persona.direccion?.pais
    });
    
    // Test básico: solo devolver los datos extraídos
    return NextResponse.json({
      success: true,
      message: 'Test simple completado',
      datos_extraidos: {
        nombre: persona.nombre,
        apellido1: persona.apellido1,
        apellido2: persona.apellido2,
        telefono: persona.telefono,
        correo: persona.correo,
        pais: persona.direccion?.pais,
        codigoMunicipio: persona.direccion?.codigoMunicipio
      },
      estructura_completa: {
        tiene_comunicaciones: !!data.comunicaciones,
        tiene_personas: !!data.comunicaciones?.[0]?.personas,
        num_personas: data.comunicaciones?.[0]?.personas?.length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test simple:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test simple',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
