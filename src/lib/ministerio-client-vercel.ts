// Cliente del MIR optimizado para Vercel (sin https.Agent)
// Versión simplificada que funciona en Edge Runtime

import JSZip from 'jszip';

export interface MinisterioConfig {
  baseUrl: string;
  username: string;
  password: string;
  codigoArrendador: string;
  aplicacion: string;
  simulacion?: boolean;
}

export interface AltaPVParams {
  xmlAlta: string;
}

export interface AltaPVResult {
  ok: boolean;
  codigo: string;
  descripcion: string;
  lote?: string;
  codigoComunicacion?: string;
  rawResponse: string;
}

function buildBasicAuthHeader(username: string, password: string): string {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${token}`;
}

async function zipAndBase64(xmlContent: string): Promise<string> {
  const zip = new JSZip();
  zip.file('solicitud.xml', xmlContent, { createFolders: false });
  const zipped = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return Buffer.from(zipped).toString('base64');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapSoapEnvelope(innerXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    ${innerXml}
  </soapenv:Body>
</soapenv:Envelope>`;
}

function buildSoapEnvelopeComunicacionA(cfg: MinisterioConfig, solicitudZipB64: string): string {
  const cabecera = `
    <cabecera>
      <codigoArrendador>${escapeXml(cfg.codigoArrendador)}</codigoArrendador>
      <aplicacion>${escapeXml(cfg.aplicacion).slice(0, 50)}</aplicacion>
      <tipoOperacion>A</tipoOperacion>
      <tipoComunicacion>PV</tipoComunicacion>
    </cabecera>`;
  const solicitud = `
    <solicitud>${solicitudZipB64}</solicitud>`;
  
  // Agregar namespace al elemento peticion según la especificación MIR
  return wrapSoapEnvelope(`<peticion xmlns="http://www.mir.es/hospedajes-web/ws/v1">${cabecera}${solicitud}</peticion>`);
}

function parseAltaResponse(xml: string): { ok: boolean; codigo: string; descripcion: string; lote?: string; codigoComunicacion?: string } {
  const codigo = matchTag(xml, 'codigo') || '';
  const descripcion = matchTag(xml, 'descripcion') || '';
  const lote = matchTag(xml, 'lote') || undefined;
  const codigoComunicacion = matchTag(xml, 'codigoComunicacion') || undefined;
  const ok = codigo === '0';
  return { ok, codigo, descripcion, lote, codigoComunicacion };
}

function matchTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

export class MinisterioClientVercel {
  constructor(private readonly cfg: MinisterioConfig) {}

  async altaPV(params: AltaPVParams): Promise<AltaPVResult> {
    if (this.cfg.simulacion) {
      const lote = `SIM-${Date.now()}`;
      const mock = `<consultaResponse><codigo>0</codigo><descripcion>Ok</descripcion><lote>${lote}</lote></consultaResponse>`;
      return { ok: true, codigo: '0', descripcion: 'Ok', lote, rawResponse: mock };
    }

    try {
      const solicitudZipB64 = await zipAndBase64(params.xmlAlta);
      const soapXml = buildSoapEnvelopeComunicacionA(this.cfg, solicitudZipB64);

      console.log('📤 Enviando SOAP al MIR:', {
        url: this.cfg.baseUrl,
        username: this.cfg.username,
        codigoArrendador: this.cfg.codigoArrendador,
        bodyLength: soapXml.length
      });

      // NOTA: Vercel no soporta https.Agent, pero podemos usar la variable NODE_TLS_REJECT_UNAUTHORIZED
      // Esta es la única forma de deshabilitar la verificación de certificados en Vercel
      const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Deshabilitar verificación SSL temporalmente
      
      let res: Response;
      try {
        res = await fetch(this.cfg.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': buildBasicAuthHeader(this.cfg.username, this.cfg.password),
            'Content-Type': 'text/xml; charset=utf-8',
            'User-Agent': 'Delfin_Check_in/1.0',
            'Accept': 'text/xml, application/xml, */*'
          },
          body: soapXml,
          signal: AbortSignal.timeout(30000) // 30 segundos timeout
        });
      } finally {
        // Siempre restaurar configuración original
        if (originalRejectUnauthorized !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
      }

      console.log('📊 Respuesta del MIR:', {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries())
      });

      const text = await res.text();
      console.log('📋 Body de respuesta (primeros 500 chars):', text.substring(0, 500));

      const parsed = parseAltaResponse(text);
      console.log('✅ Respuesta parseada:', parsed);

      return { ...parsed, rawResponse: text };

    } catch (error) {
      console.error('❌ Error en altaPV:', error);
      throw error;
    }
  }
}

export function getMinisterioConfigFromEnv(): MinisterioConfig {
  // Si falta alguna configuración crítica, activar simulación automáticamente
  const hasRequiredVars = !!(
    process.env.MIR_BASE_URL &&
    process.env.MIR_HTTP_USER &&
    process.env.MIR_HTTP_PASS &&
    process.env.MIR_CODIGO_ARRENDADOR
  );
  
  // Modo simulación: true si se configura explícitamente o si faltan variables
  const simulacion = process.env.MIR_SIMULACION === 'true' || !hasRequiredVars;
  
  if (simulacion && !hasRequiredVars) {
    console.warn('⚠️ Variables de entorno MIR no configuradas completamente. Usando modo SIMULACIÓN.');
  }
  
  return {
    baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
    username: process.env.MIR_HTTP_USER || 'DEMO',
    password: process.env.MIR_HTTP_PASS || 'DEMO',
    codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '0000000000',
    aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
    simulacion
  };
}
