import { NextRequest } from 'next/server';
import { create } from 'xmlbuilder2';
import { MinisterioClient, getMinisterioConfigFromEnv } from '@/lib/ministerio-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Espera: { codigoEstablecimiento, comunicaciones: [...] } igual que el generador de XML
    if (!body || !body.codigoEstablecimiento || !Array.isArray(body.comunicaciones)) {
      return new Response(JSON.stringify({ error: 'Payload inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Construir XML de alta PV (sin cabecera SOAP; sólo peticion/solicitud)
    const root = {
      peticion: {
        solicitud: {
          codigoEstablecimiento: body.codigoEstablecimiento,
          comunicacion: body.comunicaciones.map((c: any) => ({
            contrato: {
              referencia: c.contrato?.referencia,
              fechaContrato: c.contrato?.fechaContrato,
              fechaEntrada: c.contrato?.fechaEntrada,
              fechaSalida: c.contrato?.fechaSalida,
              numPersonas: String(c.contrato?.numPersonas || c.personas?.length || 1),
              ...(c.contrato?.numHabitaciones ? { numHabitaciones: String(c.contrato.numHabitaciones) } : {}),
              ...(typeof c.contrato?.internet === 'boolean' ? { internet: c.contrato.internet ? 'true' : 'false' } : {}),
              pago: {
                tipoPago: c.contrato?.pago?.tipoPago,
                ...(c.contrato?.pago?.fechaPago ? { fechaPago: c.contrato.pago.fechaPago } : {}),
                ...(c.contrato?.pago?.medioPago ? { medioPago: c.contrato.pago.medioPago } : {}),
                ...(c.contrato?.pago?.titular ? { titular: c.contrato.pago.titular } : {}),
                ...(c.contrato?.pago?.caducidadTarjeta ? { caducidadTarjeta: c.contrato.pago.caducidadTarjeta } : {})
              }
            },
            persona: c.personas
          }))
        }
      }
    } as any;

    const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele(root);
    const xmlAlta = doc.end({ prettyPrint: false });

    const client = new MinisterioClient(getMinisterioConfigFromEnv());
    const result = await client.altaPV({ xmlAlta });

    const statusCode = result.ok ? 200 : 502;
    return new Response(JSON.stringify({
      ok: result.ok,
      codigo: result.codigo,
      descripcion: result.descripcion,
      lote: result.lote,
      simulacion: getMinisterioConfigFromEnv().simulacion === true
    }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error en envio MIR:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}



