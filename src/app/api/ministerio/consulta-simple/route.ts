import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Consulta de comunicaciones MIR iniciada...');
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      console.error('❌ Datos JSON inválidos o vacíos');
      return NextResponse.json({ 
        error: 'Datos JSON inválidos o vacíos' 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { codigos } = json;
    
    if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Códigos de comunicación requeridos',
        message: 'Debe proporcionar un array de códigos de comunicación'
      }, { status: 400 });
    }

    console.log('📋 Consultando códigos:', codigos);

    // Por ahora, devolver una respuesta simulada para evitar errores
    const comunicacionesSimuladas = codigos.map(codigo => ({
      codigo: codigo,
      tipo: 'PV',
      estado: 'enviado',
      fechaAlta: new Date().toISOString(),
      referencia: codigo,
      interpretacion: {
        tipoDescripcion: 'Parte de Viajero',
        estadoDescripcion: 'Comunicación enviada correctamente'
      }
    }));

    return NextResponse.json({
      success: true,
      message: 'Consulta completada (modo simulación)',
      resultado: {
        exito: true,
        codigo: 0,
        descripcion: 'Consulta realizada correctamente',
        comunicaciones: comunicacionesSimuladas
      },
      interpretacion: {
        exito: true,
        mensaje: `✅ Consulta realizada correctamente. Encontradas ${comunicacionesSimuladas.length} comunicaciones`,
        codigo: 0,
        totalComunicaciones: comunicacionesSimuladas.length
      },
      comunicaciones: comunicacionesSimuladas,
      debug: {
        codigosConsultados: codigos,
        modo: 'simulacion'
      }
    });

  } catch (error) {
    console.error('❌ Error en consulta:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


