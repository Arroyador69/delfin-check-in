// Cliente MIR con autenticación corregida
// Versión optimizada para Vercel con manejo mejorado de autenticación

import JSZip from 'jszip';

export interface MinisterioConfig {
  baseUrl: string;
  username: string;
  password: string;
  codigoArrendador: string;
  aplicacion: string;
  simulacion?: boolean;
  soapAction?: string; // opcional: algunos servidores requieren el literal del método
  soapStyle?: 'mir' | 'com'; // 'mir' = actual, 'com' = comunicacionRequest con namespace externo
  soapNamespace?: string; // namespace para estilo 'com'
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
  debugSoap?: string; // opcional: SOAP enviado (para soporte)
  solicitudZipB64Sample?: string; // muestra de la solicitud zip base64
}

function buildBasicAuthHeader(username: string, password: string): string {
  // Codificación mejorada: usuario:contraseña con trim y encoding UTF-8
  const credentials = `${username.trim()}:${password.trim()}`;
  const token = Buffer.from(credentials, 'utf8').toString('base64');
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

// Variante alternativa segun WSDL externo: com:comunicacionRequest en namespace dedicado
function buildSoapEnvelopeComunicacionAlt(cfg: MinisterioConfig, solicitudZipB64: string): string {
  const ns = cfg.soapNamespace || 'http://www.soap.servicios.hospedajes.mir.es/comunicacion';
  const cabecera = `
    <cabecera>
      <codigoArrendador>${escapeXml(cfg.codigoArrendador)}</codigoArrendador>
      <aplicacion>${escapeXml(cfg.aplicacion).slice(0, 50)}</aplicacion>
      <tipoOperacion>A</tipoOperacion>
      <tipoComunicacion>PV</tipoComunicacion>
    </cabecera>`;
  const solicitud = `
    <solicitud>${solicitudZipB64}</solicitud>`;
  const body = `<com:comunicacionRequest xmlns:com="${ns}"><peticion>${cabecera}${solicitud}</peticion></com:comunicacionRequest>`;
  return wrapSoapEnvelope(body);
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

export class MinisterioClientFixed {
  constructor(private readonly cfg: MinisterioConfig) {}

  async altaPV(params: AltaPVParams): Promise<AltaPVResult> {
    if (this.cfg.simulacion) {
      const lote = `SIM-${Date.now()}`;
      const mock = `<consultaResponse><codigo>0</codigo><descripcion>Ok</descripcion><lote>${lote}</lote></consultaResponse>`;
      return { ok: true, codigo: '0', descripcion: 'Ok', lote, rawResponse: mock };
    }

    try {
      const solicitudZipB64 = await zipAndBase64(params.xmlAlta);
      const soapXml = (this.cfg.soapStyle === 'com')
        ? buildSoapEnvelopeComunicacionAlt(this.cfg, solicitudZipB64)
        : buildSoapEnvelopeComunicacionA(this.cfg, solicitudZipB64);

      console.log('📤 Enviando SOAP al MIR con autenticación corregida:', {
        url: this.cfg.baseUrl,
        username: this.cfg.username,
        codigoArrendador: this.cfg.codigoArrendador,
        bodyLength: soapXml.length,
        authHeader: buildBasicAuthHeader(this.cfg.username, this.cfg.password)
      });

      // Configuración de fetch optimizada para Vercel
      const contentLength = Buffer.byteLength(soapXml, 'utf8');

      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Authorization': buildBasicAuthHeader(this.cfg.username, this.cfg.password),
          'Content-Type': 'text/xml; charset=utf-8',
          'Content-Length': contentLength.toString(),
          'SOAPAction': this.cfg.soapAction ?? '""',
          'User-Agent': 'Delfin_Check_in/1.0',
          'Accept': 'text/xml, application/xml, */*',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Connection': 'close'
        },
        body: soapXml,
        signal: AbortSignal.timeout(60000), // 60 segundos timeout
        // Configuración específica para Vercel
        redirect: 'follow',
        keepalive: false
      };

      // Deshabilitar verificación SSL temporalmente para pruebas
      const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      
      let res: Response;
      try {
        res = await fetch(this.cfg.baseUrl, fetchOptions);
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
        headers: Object.fromEntries(res.headers.entries()),
        ok: res.ok
      });

      const text = await res.text();
      console.log('📋 Body de respuesta (primeros 1000 chars):', text.substring(0, 1000));

      if (!res.ok) {
        console.error('❌ Error HTTP:', res.status, res.statusText);
        return {
          ok: false,
          codigo: res.status.toString(),
          descripcion: `HTTP ${res.status}: ${res.statusText}`,
          rawResponse: text,
          debugSoap: process.env.MIR_DEBUG_SOAP === 'true' ? soapXml : undefined,
          solicitudZipB64Sample: process.env.MIR_DEBUG_SOAP === 'true' ? solicitudZipB64.substring(0, 120) + '...' : undefined
        };
      }

      const parsed = parseAltaResponse(text);
      console.log('✅ Respuesta parseada:', parsed);

      return { 
        ...parsed, 
        rawResponse: text,
        debugSoap: process.env.MIR_DEBUG_SOAP === 'true' ? soapXml : undefined,
        solicitudZipB64Sample: process.env.MIR_DEBUG_SOAP === 'true' ? solicitudZipB64.substring(0, 120) + '...' : undefined
      };

    } catch (error) {
      console.error('❌ Error en altaPV:', error);
      
      // Manejo específico de errores de timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          ok: false,
          codigo: 'TIMEOUT',
          descripcion: 'Timeout en la conexión con el MIR',
          rawResponse: ''
        };
      }
      
      // Manejo específico de errores de red
      if (error instanceof Error && error.message.includes('fetch failed')) {
        return {
          ok: false,
          codigo: 'NETWORK_ERROR',
          descripcion: 'Error de conectividad con el MIR',
          rawResponse: ''
        };
      }
      
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
    baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
    username: process.env.MIR_HTTP_USER || 'DEMO',
    password: process.env.MIR_HTTP_PASS || 'DEMO',
    codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '0000000000',
    aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
    simulacion,
    soapAction: process.env.MIR_SOAP_ACTION,
    soapStyle: (process.env.MIR_SOAP_STYLE === 'com' ? 'com' : 'mir'),
    soapNamespace: process.env.MIR_SOAP_NAMESPACE || 'http://www.soap.servicios.hospedajes.mir.es/comunicacion'
  };
}


