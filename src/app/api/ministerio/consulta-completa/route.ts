import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    const { codigoReferencia } = await req.json();
    
    console.log('🔍 Consultando referencia:', codigoReferencia);
    
    if (!codigoReferencia) {
      return NextResponse.json({
        ok: false,
        error: 'Código de referencia requerido'
      }, { status: 400 });
    }
    
    // Buscar en la base de datos
    const result = await sql`
      SELECT 
        gr.id,
        gr.reserva_ref,
        gr.data,
        gr.created_at,
        mc.referencia as mir_referencia,
        mc.tipo as mir_tipo,
        mc.estado as mir_estado,
        mc.lote as mir_lote,
        mc.resultado as mir_resultado,
        mc.error as mir_error,
        mc.created_at as mir_created_at
      FROM guest_registrations gr
      LEFT JOIN mir_comunicaciones mc ON gr.data->>'codigoEstablecimiento' = mc.resultado::jsonb->>'codigoArrendador'
      WHERE gr.reserva_ref = ${codigoReferencia}
         OR mc.referencia = ${codigoReferencia}
      ORDER BY gr.created_at DESC
      LIMIT 1
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        ok: false,
        error: 'No se encontró ninguna comunicación con esa referencia'
      }, { status: 404 });
    }
    
    const registro = result.rows[0];
    
    // Extraer información del huésped
    let nombreCompleto = 'Datos no disponibles';
    let datosHuesped = null;
    
    try {
      if (registro.data?.comunicaciones?.[0]?.personas?.[0]) {
        const persona = registro.data.comunicaciones[0].personas[0];
        nombreCompleto = `${persona.nombre || ''} ${persona.apellido1 || ''} ${persona.apellido2 || ''}`.trim();
        datosHuesped = {
          nombre: persona.nombre,
          apellido1: persona.apellido1,
          apellido2: persona.apellido2,
          tipoDocumento: persona.tipoDocumento,
          numeroDocumento: persona.numeroDocumento,
          nacionalidad: persona.nacionalidad,
          fechaNacimiento: persona.fechaNacimiento,
          sexo: persona.sexo
        };
      }
    } catch (error) {
      console.log('Error extrayendo datos del huésped:', error);
    }
    
    // Determinar estado y tipo
    const estado = registro.mir_estado || 'pendiente';
    const tipo = registro.mir_tipo || 'PV';
    const lote = registro.mir_lote || 'Sin lote asignado';
    
    // Interpretar estado
    const interpretacionEstado = interpretarEstado(estado);
    const interpretacionTipo = interpretarTipo(tipo);
    
    const resultado = {
      codigo: registro.mir_referencia || registro.reserva_ref,
      tipo: tipo,
      estado: estado,
      referencia: registro.mir_referencia || registro.reserva_ref,
      fechaAlta: registro.created_at,
      fechaEnvio: registro.mir_created_at,
      lote: lote,
      nombreReserva: nombreCompleto,
      datosHuesped: datosHuesped,
      interpretacion: {
        tipoDescripcion: interpretacionTipo,
        estadoDescripcion: interpretacionEstado
      },
      detalles: {
        establecimiento: registro.data?.codigoEstablecimiento || 'N/A',
        fechaEntrada: registro.data?.comunicaciones?.[0]?.contrato?.fechaEntrada || 'N/A',
        fechaSalida: registro.data?.comunicaciones?.[0]?.contrato?.fechaSalida || 'N/A',
        numPersonas: registro.data?.comunicaciones?.[0]?.contrato?.numPersonas || 0
      }
    };
    
    return NextResponse.json({
      ok: true,
      resultados: [resultado],
      total: 1,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en consulta:', error);
    return NextResponse.json({
      ok: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

function interpretarEstado(estado: string): string {
  const estados = {
    'pendiente': 'Comunicación registrada pero no enviada al MIR',
    'enviado': 'Comunicación enviada correctamente al MIR',
    'confirmado': 'Comunicación confirmada por el MIR',
    'error': 'Error en el envío o procesamiento',
    'anulado': 'Comunicación anulada'
  };
  
  return estados[estado] || 'Estado desconocido';
}

function interpretarTipo(tipo: string): string {
  const tipos = {
    'PV': 'Parte de Viajeros - Registro de entrada/salida',
    'RH': 'Reserva de Hospedaje - Reserva previa',
    'AV': 'Alta de Viajero - Nuevo registro',
    'RV': 'Reserva de Viajero - Reserva individual'
  };
  
  return tipos[tipo] || 'Tipo de comunicación desconocido';
}




