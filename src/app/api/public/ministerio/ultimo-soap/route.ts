import { NextRequest, NextResponse } from 'next/server';
import { getMinisterioConfigFromEnv, MinisterioClientFixed } from '@/lib/ministerio-client-fixed';

export async function POST(req: NextRequest) {
  try {
    // Construir un XML mínimo de prueba
    const now = new Date().toISOString().split('T')[0];
    const xmlAlta = `<?xml version="1.0" encoding="UTF-8"?>\n<solicitud>\n  <codigoEstablecimiento>0000256653</codigoEstablecimiento>\n  <codigoArrendador>${process.env.MIR_CODIGO_ARRENDADOR || ''}</codigoArrendador>\n  <aplicacion>${process.env.MIR_APLICACION || 'Delfin_Check_in'}</aplicacion>\n  <tipoOperacion>A</tipoOperacion>\n  <tipoComunicacion>PV</tipoComunicacion>\n  <datosViajero>\n    <nombre>TEST</nombre>\n    <apellidos>SOAP</apellidos>\n    <fechaNacimiento>1990-01-01</fechaNacimiento>\n    <nacionalidad>ES</nacionalidad>\n    <tipoDocumento>NIF</tipoDocumento>\n    <numeroDocumento>12345678Z</numeroDocumento>\n    <fechaEntrada>${now}</fechaEntrada>\n    <fechaSalida>${now}</fechaSalida>\n  </datosViajero>\n</solicitud>`;

    const cfg = getMinisterioConfigFromEnv();
    // Forzar que devuelva el SOAP en la respuesta para inspección
    process.env.MIR_DEBUG_SOAP = 'true';
    const client = new MinisterioClientFixed(cfg);
    const res = await client.altaPV({ xmlAlta });

    return NextResponse.json({ success: true, sample: {
      debugSoap: res.debugSoap?.substring(0, 2000) || null,
      solicitudZipB64Sample: res.solicitudZipB64Sample || null,
      status: { ok: res.ok, codigo: res.codigo, descripcion: res.descripcion }
    }});
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}


