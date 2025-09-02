import { NextRequest } from 'next/server';
import { z } from 'zod';

const PayloadSchema = z.object({
  codigoEstablecimiento: z.string().min(1).max(10),
  comunicaciones: z.array(z.object({
    contrato: z.object({
      referencia: z.string().min(1),
      fechaContrato: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      fechaEntrada: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
      fechaSalida: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
      numPersonas: z.number().int().positive(),
      numHabitaciones: z.number().int().positive().optional(),
      internet: z.boolean().optional(),
      pago: z.object({
        tipoPago: z.enum(['EFECT','TARJT','PLATF','TRANS','MOVIL','TREG','DESTI','OTRO']),
        fechaPago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        medioPago: z.string().optional(),
        titular: z.string().optional(),
        caducidadTarjeta: z.string().regex(/^\d{2}\/\d{4}$/).optional(),
      })
    }),
    personas: z.array(z.any()).min(1),
  })).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => undefined);
    const parsed = PayloadSchema.safeParse(json);
    
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const { codigoEstablecimiento, comunicaciones } = parsed.data;
    
    // Por ahora, redirigir a la API existente para generar XML individual
    // TODO: Implementar generación de XML conjunto
    const xmlResponses = [];
    
    for (const comunicacion of comunicaciones) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ministerio/partes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigoEstablecimiento,
            comunicaciones: [comunicacion]
          })
        });
        
        if (res.ok) {
          const xml = await res.text();
          xmlResponses.push(xml);
        }
      } catch (error) {
        console.error('Error generando XML para comunicación:', error);
      }
    }
    
    // Combinar todos los XML en uno solo
    const combinedXML = xmlResponses.join('\n\n<!-- Separador entre comunicaciones -->\n\n');
    
    return new Response(combinedXML, {
      status: 200,
      headers: { 
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="partes_viajeros_conjunto_${codigoEstablecimiento}_${new Date().toISOString().slice(0,10)}.xml"`
      }
    });
  } catch (error) {
    console.error('Error generando XML conjunto:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
