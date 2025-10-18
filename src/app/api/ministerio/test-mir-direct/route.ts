import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Test directo de conectividad MIR...');

    const config = {
      baseUrl: process.env.MIR_BASE_URL,
      username: process.env.MIR_HTTP_USER,
      password: process.env.MIR_HTTP_PASS,
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR,
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in'
    };

    console.log('🔧 Configuración MIR:', {
      baseUrl: config.baseUrl || 'NO_CONFIGURADO',
      username: config.username ? 'CONFIGURADO' : 'NO_CONFIGURADO',
      codigoArrendador: config.codigoArrendador || 'NO_CONFIGURADO'
    });

    if (!config.baseUrl || !config.username || !config.password || !config.codigoArrendador) {
      return NextResponse.json({
        success: false,
        error: 'Configuración MIR incompleta',
        config: {
          baseUrl: !!config.baseUrl,
          username: !!config.username,
          password: !!config.password,
          codigoArrendador: !!config.codigoArrendador
        }
      }, { status: 400 });
    }

    // Test simple de conectividad
    const testSoap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="http://www.soap.servicios.hospedajes.mir.es/comunicacion">
  <soapenv:Header/>
  <soapenv:Body>
    <com:consultaLoteRequest>
      <com:codigosLote>
        <com:lote>TEST-CONNECTIVITY</com:lote>
      </com:codigosLote>
    </com:consultaLoteRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

    console.log('🔍 Enviando test de conectividad al MIR...');

    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
        'Content-Type': 'text/xml; charset=utf-8',
        'User-Agent': 'Delfin_Check_in/1.0',
        'SOAPAction': ''
      },
      body: testSoap,
      signal: AbortSignal.timeout(10000)
    });

    const responseText = await response.text();
    
    console.log('📊 Respuesta MIR:', responseText);

    return NextResponse.json({
      success: true,
      message: 'Test de conectividad completado',
      status: response.status,
      statusText: response.statusText,
      response: responseText,
      config: {
        baseUrl: config.baseUrl,
        username: config.username ? 'CONFIGURADO' : 'NO_CONFIGURADO',
        codigoArrendador: config.codigoArrendador
      }
    });

  } catch (error) {
    console.error('❌ Error en test de conectividad:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en test de conectividad',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
