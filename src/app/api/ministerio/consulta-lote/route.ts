import { NextRequest } from 'next/server';
import { MinisterioClient, getMinisterioConfigFromEnv } from '@/lib/ministerio-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Espera: { lotes: ["12345", "67890"] }
    if (!body || !Array.isArray(body.lotes) || body.lotes.length === 0 || body.lotes.length > 10) {
      return new Response(JSON.stringify({ error: 'Debe enviar entre 1 y 10 lotes' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const client = new MinisterioClient(getMinisterioConfigFromEnv());
    const result = await client.consultaLote({ lotes: body.lotes });

    const statusCode = result.ok ? 200 : 502;
    return new Response(JSON.stringify({
      ok: result.ok,
      codigo: result.codigo,
      descripcion: result.descripcion,
      resultados: result.resultados,
      simulacion: getMinisterioConfigFromEnv().simulacion === true
    }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error en consulta de lote MIR:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}



