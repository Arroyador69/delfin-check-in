import { NextRequest } from 'next/server';
import { getComunicaciones } from '@/lib/kv';
import { create } from 'xmlbuilder2';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0,10);
  const items = await getComunicaciones(date);
  if (!items.length) {
    return new Response(JSON.stringify({ error: 'No hay comunicaciones para esa fecha' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const codigoEstablecimiento = items[0].codigoEstablecimiento;
  const root: any = {
    peticion: {
      solicitud: {
        codigoEstablecimiento,
        comunicacion: items.map((it) => ({
          contrato: {
            referencia: it.contrato.referencia,
            fechaContrato: it.contrato.fechaContrato,
            fechaEntrada: it.contrato.fechaEntrada,
            fechaSalida: it.contrato.fechaSalida,
            numPersonas: String(it.contrato.numPersonas),
            ...(it.contrato.numHabitaciones ? { numHabitaciones: String(it.contrato.numHabitaciones) } : {}),
            ...(typeof it.contrato.internet === 'boolean' ? { internet: it.contrato.internet ? 'true' : 'false' } : {}),
            pago: {
              tipoPago: it.contrato.pago.tipoPago,
              ...(it.contrato.pago.fechaPago ? { fechaPago: it.contrato.pago.fechaPago } : {}),
              ...(it.contrato.pago.medioPago ? { medioPago: it.contrato.pago.medioPago } : {}),
              ...(it.contrato.pago.titular ? { titular: it.contrato.pago.titular } : {}),
              ...(it.contrato.pago.caducidadTarjeta ? { caducidadTarjeta: it.contrato.pago.caducidadTarjeta } : {})
            }
          },
          persona: it.personas
        }))
      }
    }
  };

  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele(root);
  const xml = doc.end({ prettyPrint: true });
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename=partes_viajeros_${date}.xml`
    }
  });
}


