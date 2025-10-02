import { NextRequest, NextResponse } from 'next/server';
import { saveComunicacion } from '@/lib/kv';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test auto-envío iniciado...');
    
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

    console.log('📋 Datos recibidos:', JSON.stringify(json, null, 2));

    // Generar referencia única
    const referencia = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simular resultado del MIR (modo simulación)
    const resultado = {
      ok: true,
      codigo: '0',
      descripcion: 'Ok',
      lote: `SIM-${Date.now()}`,
      rawResponse: '<consultaResponse><codigo>0</codigo><descripcion>Ok</descripcion><lote>SIM-TEST</lote></consultaResponse>'
    };

    console.log('✅ Resultado simulado:', resultado);

    // Guardar comunicación en KV
    const comunicacion = {
      id: referencia,
      timestamp: new Date().toISOString(),
      datos: json,
      resultado: resultado,
      estado: 'enviado',
      lote: resultado.lote,
      error: null
    };

    console.log('💾 Guardando comunicación:', comunicacion);
    await saveComunicacion(comunicacion);
    console.log('✅ Comunicación guardada exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Test auto-envío completado',
      referencia: referencia,
      resultado: resultado,
      estado: 'enviado',
      lote: resultado.lote
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en test auto-envío:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test auto-envío',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
