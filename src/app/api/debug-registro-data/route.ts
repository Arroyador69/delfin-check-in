import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const registroId = searchParams.get('id');
    
    if (!registroId) {
      return NextResponse.json({
        success: false,
        error: 'ID de registro requerido'
      }, { status: 400 });
    }
    
    // Obtener el registro específico con todos sus datos
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
    
    return NextResponse.json({
      success: true,
      registro: {
        id: row.id,
        created_at: row.created_at,
        fecha_entrada: row.fecha_entrada,
        fecha_salida: row.fecha_salida,
        reserva_ref: row.reserva_ref,
        data_completo: row.data,
        datos_extraidos: {
          nombre: row.data?.nombre,
          apellido1: row.data?.apellido1,
          apellido2: row.data?.apellido2,
          telefono: row.data?.telefono,
          email: row.data?.email,
          tipoDocumento: row.data?.tipoDocumento,
          numeroDocumento: row.data?.numeroDocumento,
          fechaNacimiento: row.data?.fechaNacimiento,
          nacionalidad: row.data?.nacionalidad,
          direccion: row.data?.direccion,
          codigoPostal: row.data?.codigoPostal,
          pais: row.data?.pais,
          codigoMunicipio: row.data?.codigoMunicipio,
          mir_status: row.data?.mir_status
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error inspeccionando registro:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error inspeccionando registro',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
