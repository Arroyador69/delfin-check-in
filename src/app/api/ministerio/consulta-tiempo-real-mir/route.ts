import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Consulta en tiempo real con el MIR...');

    // Verificar configuración MIR
    const config = {
      baseUrl: process.env.MIR_BASE_URL,
      username: process.env.MIR_HTTP_USER,
      password: process.env.MIR_HTTP_PASS,
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR,
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in'
    };

    console.log('🔧 Configuración MIR:', {
      baseUrl: config.baseUrl ? 'CONFIGURADO' : 'NO_CONFIGURADO',
      username: config.username ? 'CONFIGURADO' : 'NO_CONFIGURADO',
      codigoArrendador: config.codigoArrendador ? 'CONFIGURADO' : 'NO_CONFIGURADO'
    });

    // Obtener lotes de la base de datos
    const result = await sql`
      SELECT DISTINCT mc.lote
      FROM mir_comunicaciones mc
      WHERE mc.lote IS NOT NULL AND mc.lote != '' AND mc.lote != 'SIM-'
      ORDER BY mc.created_at DESC
      LIMIT 10
    `;

    console.log(`📋 Encontrados ${result.rows.length} lotes para consultar`);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay lotes para consultar',
        consultados: 0,
        actualizados: 0
      });
    }

    const lotes = result.rows.map(r => r.lote).filter(Boolean);
    console.log(`🔍 Consultando ${lotes.length} lotes al MIR:`, lotes);

    // Consultar cada lote individualmente al MIR
    const actualizados = [];
    let totalActualizados = 0;

    for (const lote of lotes) {
      try {
        const resultado = await consultarLoteMIR(config, lote);
        console.log(`📊 Resultado para lote ${lote}:`, resultado);

        if (resultado.ok && resultado.codigoEstado) {
          let nuevoEstado = 'enviado';
          let descripcionEstado = 'Enviado al MIR';

          switch (resultado.codigoEstado) {
            case 1: // Procesado correctamente
              nuevoEstado = 'confirmado';
              descripcionEstado = 'Confirmado por el MIR - Procesado correctamente';
              break;
            case 4: // Pendiente de procesamiento
              nuevoEstado = 'enviado';
              descripcionEstado = 'Pendiente de procesamiento por el MIR';
              break;
            case 5: // Error en procesamiento
              nuevoEstado = 'error';
              descripcionEstado = 'Error en procesamiento por el MIR';
              break;
            case 6: // Anulado
              nuevoEstado = 'error';
              descripcionEstado = 'Comunicación anulada por el MIR';
              break;
          }

          // Actualizar mir_comunicaciones
          await sql`
            UPDATE mir_comunicaciones 
            SET 
              estado = ${nuevoEstado},
              resultado = jsonb_set(
                COALESCE(resultado, '{}'::jsonb),
                '{codigoEstado}', 
                ${resultado.codigoEstado}::jsonb
              ),
              resultado = jsonb_set(
                resultado,
                '{descEstado}', 
                ${descripcionEstado}::jsonb
              ),
              resultado = jsonb_set(
                resultado,
                '{ultimaConsulta}', 
                ${new Date().toISOString()}::jsonb
              )
            WHERE lote = ${lote}
          `;

          // Actualizar guest_registrations
          await sql`
            UPDATE guest_registrations 
            SET data = jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{mir_status}',
              jsonb_build_object(
                'estado', ${nuevoEstado},
                'lote', ${lote},
                'codigoEstado', ${resultado.codigoEstado},
                'descEstado', ${descripcionEstado},
                'ultimaConsulta', ${new Date().toISOString()}
              )
            )
            WHERE reserva_ref IN (
              SELECT referencia FROM mir_comunicaciones WHERE lote = ${lote}
            )
          `;

          actualizados.push({
            lote,
            codigoEstado: resultado.codigoEstado,
            nuevoEstado,
            descripcion: descripcionEstado
          });

          totalActualizados++;
          console.log(`✅ Actualizado lote ${lote}: ${nuevoEstado} (${resultado.codigoEstado})`);
        }
      } catch (error) {
        console.error(`❌ Error consultando lote ${lote}:`, error);
      }
    }

    console.log(`📝 Se actualizaron ${totalActualizados} comunicaciones en tiempo real`);

    return NextResponse.json({
      success: true,
      mensaje: `Consulta en tiempo real realizada correctamente - ${lotes.length} lotes consultados, ${totalActualizados} actualizados`,
      lotesConsultados: lotes.length,
      actualizados: totalActualizados,
      detalles: actualizados,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error consultando MIR en tiempo real:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno consultando MIR en tiempo real',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// Función para consultar un lote específico al MIR
async function consultarLoteMIR(config: any, lote: string): Promise<any> {
  try {
    // Construir SOAP request según especificación oficial MIR
    const soapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="http://www.soap.servicios.hospedajes.mir.es/comunicacion">
  <soapenv:Header/>
  <soapenv:Body>
    <com:consultaLoteRequest>
      <com:codigosLote>
        <com:lote>${lote}</com:lote>
      </com:codigosLote>
    </com:consultaLoteRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

    console.log(`🔍 Enviando consulta para lote ${lote} al MIR`);

    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
        'Content-Type': 'text/xml; charset=utf-8',
        'User-Agent': 'Delfin_Check_in/1.0',
        'SOAPAction': ''
      },
      body: soapXml,
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log(`📊 Respuesta MIR para lote ${lote}:`, responseText);

    // Parsear respuesta XML
    const codigo = extractXmlTag(responseText, 'codigo');
    const descripcion = extractXmlTag(responseText, 'descripcion');
    const codigoEstado = extractXmlTag(responseText, 'codigoEstado');
    const descEstado = extractXmlTag(responseText, 'descEstado');

    return {
      ok: codigo === '0',
      codigo,
      descripcion,
      codigoEstado: codigoEstado ? parseInt(codigoEstado) : null,
      descEstado
    };

  } catch (error) {
    console.error(`❌ Error consultando lote ${lote}:`, error);
    return {
      ok: false,
      codigo: '999',
      descripcion: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      codigoEstado: null,
      descEstado: ''
    };
  }
}

// Función para extraer tags XML
function extractXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}