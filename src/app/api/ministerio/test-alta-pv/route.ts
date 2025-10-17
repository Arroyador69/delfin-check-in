import { NextRequest, NextResponse } from 'next/server';
import { getMinisterioConfigFromEnv, MinisterioClientFixed } from '@/lib/ministerio-client-fixed';
import { buildPvXml } from '@/lib/mir-xml-pv';

export async function POST(req: NextRequest) {
  try {
    const today = new Date();
    const ymd = today.toISOString().split('T')[0];
    const entrada = `${ymd}T15:00:00`;
    const salida = `${ymd}T10:00:00`;

    const xml = buildPvXml({
      codigoEstablecimiento: '0000256653',
      contrato: {
        referencia: `PV-TEST-${Date.now()}`,
        fechaContrato: ymd,
        fechaEntrada: entrada,
        fechaSalida: salida,
        numPersonas: 1,
        tipoPago: 'EFECT'
      },
      personas: [
        {
          nombre: 'Prueba',
          apellido1: 'MIR',
          apellido2: 'PV',
          tipoDocumento: 'NIF',
          numeroDocumento: '00000000T',
          fechaNacimiento: '1980-01-01',
          correo: 'prueba@example.com',
          direccion: {
            direccion: 'C/ Falsa 123',
            codigoPostal: '28080',
            pais: 'ESP',
            codigoMunicipio: '28079'
          }
        }
      ]
    });

    const cfg = getMinisterioConfigFromEnv();
    // Forzamos cabecera A + PV en el lado SOAP (ya lo hace client)
    process.env.MIR_DEBUG_SOAP = 'true';
    const client = new MinisterioClientFixed(cfg);
    const res = await client.altaPV({ xmlAlta: xml });

    return NextResponse.json({ success: res.ok, resultado: res, xmlSample: xml.substring(0, 500) });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}


