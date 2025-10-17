// Cliente MIR oficial basado en la documentación v3.1.3
// Implementa estrictamente las especificaciones WSDL/XSD oficiales

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
  debugSoap?: string;
}

export interface ConsultaComunicacionParams {
  codigos: string[];
}

export interface ConsultaComunicacionResult {
  ok: boolean;
  codigo: string;
  descripcion: string;
  comunicaciones: Array<{
    codigo: string;
    tipo: string;
    estado: string;
    fechaAlta: string;
    referencia: string;
  }>;
  rawResponse: string;
}

export interface AnulacionLoteParams {
  lote: string;
}

export interface AnulacionLoteResult {
  ok: boolean;
  codigo: string;
  descripcion: string;
  rawResponse: string;
}

export interface ConsultaCatalogoParams {
  catalogo: string;
}

export interface ConsultaCatalogoResult {
  ok: boolean;
  codigo: string;
  descripcion: string;
  elementos: Array<{
    codigo: string;
    descripcion: string;
  }>;
  rawResponse: string;
}

// Constantes según documentación oficial
const MIR_NAMESPACES = {
  COMUNICACION: 'http://www.soap.servicios.hospedajes.mir.es/comunicacion',
  TIPO_COMUNICACION: 'http://www.soap.servicios.hospedajes.mir.es/tipoComunicacion'
};

const MIR_OPERATIONS = {
  COMUNICACION: 'comunicacion',
  CONSULTA_COMUNICACION: 'consultaComunicacion',
  ANULACION_LOTE: 'anulacionLote',
  CONSULTA_LOTE: 'consultaLote',
  CATALOGO: 'catalogo'
};

function buildBasicAuthHeader(username: string, password: string): string {
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

// Construye el SOAP para comunicación según WSDL oficial
// Basado en la documentación: XML comprimido en ZIP y codificado en Base64
function buildSoapComunicacionRequest(cfg: MinisterioConfig, solicitudZipB64: string): string {
  const cabecera = `
    <cabecera>
      <codigoArrendador>${escapeXml(cfg.codigoArrendador)}</codigoArrendador>
      <aplicacion>${escapeXml(cfg.aplicacion).slice(0, 50)}</aplicacion>
      <tipoOperacion>A</tipoOperacion>
      <tipoComunicacion>PV</tipoComunicacion>
    </cabecera>`;
  
  // El contenido Base64 del ZIP se incluye en el campo <solicitud>
  const solicitud = `
    <solicitud>${solicitudZipB64}</solicitud>`;
  
  const peticion = `<peticion>${cabecera}${solicitud}</peticion>`;
  
  // Según WSDL: comunicacionRequest con namespace oficial
  const comunicacionRequest = `<com:comunicacionRequest xmlns:com="${MIR_NAMESPACES.COMUNICACION}">${peticion}</com:comunicacionRequest>`;
  
  return wrapSoapEnvelope(comunicacionRequest);
}

// Construye el SOAP para consulta de comunicación
function buildSoapConsultaComunicacionRequest(cfg: MinisterioConfig, codigos: string[]): string {
  const codigosXml = codigos.map(codigo => `<codigo>${escapeXml(codigo)}</codigo>`).join('\n');
  
  const codigosElement = `<codigos>${codigosXml}</codigos>`;
  
  // Según WSDL: consultaComunicacionRequest
  const consultaRequest = `<com:consultaComunicacionRequest xmlns:com="${MIR_NAMESPACES.COMUNICACION}">${codigosElement}</com:consultaComunicacionRequest>`;
  
  return wrapSoapEnvelope(consultaRequest);
}

// Construye el SOAP para anulación de lote
function buildSoapAnulacionLoteRequest(cfg: MinisterioConfig, lote: string): string {
  const loteElement = `<lote>${escapeXml(lote)}</lote>`;
  
  // Según WSDL: anulacionLoteRequest
  const anulacionRequest = `<com:anulacionLoteRequest xmlns:com="${MIR_NAMESPACES.COMUNICACION}">${loteElement}</com:anulacionLoteRequest>`;
  
  return wrapSoapEnvelope(anulacionRequest);
}

// Construye el SOAP para consulta de catálogo
function buildSoapCatalogoRequest(cfg: MinisterioConfig, catalogo: string): string {
  const peticion = `<peticion><catalogo>${escapeXml(catalogo)}</catalogo></peticion>`;
  
  // Según WSDL: catalogoRequest
  const catalogoRequest = `<com:catalogoRequest xmlns:com="${MIR_NAMESPACES.COMUNICACION}">${peticion}</com:catalogoRequest>`;
  
  return wrapSoapEnvelope(catalogoRequest);
}

function parseAltaResponse(xml: string): { ok: boolean; codigo: string; descripcion: string; lote?: string; codigoComunicacion?: string } {
  const codigo = matchTag(xml, 'codigo') || '';
  const descripcion = matchTag(xml, 'descripcion') || '';
  const lote = matchTag(xml, 'lote') || undefined;
  const codigoComunicacion = matchTag(xml, 'codigoComunicacion') || undefined;
  const ok = codigo === '0';
  return { ok, codigo, descripcion, lote, codigoComunicacion };
}

function parseConsultaResponse(xml: string): ConsultaComunicacionResult {
  const codigo = matchTag(xml, 'codigo') || '';
  const descripcion = matchTag(xml, 'descripcion') || '';
  const ok = codigo === '0';
  
  // Extraer comunicaciones
  const comunicaciones: Array<{
    codigo: string;
    tipo: string;
    estado: string;
    fechaAlta: string;
    referencia: string;
  }> = [];
  
  // Buscar todas las comunicaciones en la respuesta
  const comunicacionMatches = xml.match(/<comunicacion>([\s\S]*?)<\/comunicacion>/g);
  if (comunicacionMatches) {
    comunicacionMatches.forEach(match => {
      const codigo = matchTag(match, 'codigo') || '';
      const tipo = matchTag(match, 'tipo') || '';
      const fechaAlta = matchTag(match, 'fechaAlta') || '';
      const referencia = matchTag(match, 'referencia') || '';
      const anulada = matchTag(match, 'anulada') || 'false';
      
      comunicaciones.push({
        codigo,
        tipo,
        estado: anulada === 'true' ? 'ANULADA' : 'ACTIVA',
        fechaAlta,
        referencia
      });
    });
  }
  
  return { ok, codigo, descripcion, comunicaciones, rawResponse: xml };
}

function parseAnulacionResponse(xml: string): AnulacionLoteResult {
  const codigo = matchTag(xml, 'codigo') || '';
  const descripcion = matchTag(xml, 'descripcion') || '';
  const ok = codigo === '0';
  return { ok, codigo, descripcion, rawResponse: xml };
}

function parseCatalogoResponse(xml: string): ConsultaCatalogoResult {
  const codigo = matchTag(xml, 'codigo') || '';
  const descripcion = matchTag(xml, 'descripcion') || '';
  const ok = codigo === '0';
  
  // Extraer elementos del catálogo
  const elementos: Array<{ codigo: string; descripcion: string }> = [];
  
  // Buscar todas las tuplas en la respuesta
  const tuplaMatches = xml.match(/<tupla>([\s\S]*?)<\/tupla>/g);
  if (tuplaMatches) {
    tuplaMatches.forEach(match => {
      const codigo = matchTag(match, 'codigo') || '';
      const descripcion = matchTag(match, 'descripcion') || '';
      
      if (codigo && descripcion) {
        elementos.push({ codigo, descripcion });
      }
    });
  }
  
  return { ok, codigo, descripcion, elementos, rawResponse: xml };
}

function matchTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

async function makeSoapRequest(cfg: MinisterioConfig, soapXml: string, operation: string): Promise<Response> {
  const contentLength = Buffer.byteLength(soapXml, 'utf8');
  
  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Authorization': buildBasicAuthHeader(cfg.username, cfg.password),
      'Content-Type': 'text/xml; charset=utf-8',
      'Content-Length': contentLength.toString(),
      'SOAPAction': `"${operation}"`,
      'User-Agent': 'Delfin_Check_in/1.0',
      'Accept': 'text/xml, application/xml, */*',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'close'
    },
    body: soapXml,
    signal: AbortSignal.timeout(60000),
    redirect: 'follow',
    keepalive: false
  };

  // Deshabilitar verificación SSL temporalmente
  const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  try {
    return await fetch(cfg.baseUrl, fetchOptions);
  } finally {
    if (originalRejectUnauthorized !== undefined) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
    } else {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
  }
}

export class MinisterioClientOfficial {
  constructor(private readonly cfg: MinisterioConfig) {}

  async altaPV(params: AltaPVParams): Promise<AltaPVResult> {
    if (this.cfg.simulacion) {
      const lote = `SIM-${Date.now()}`;
      const mock = `<comunicacionResponse><respuesta><codigo>0</codigo><descripcion>Ok</descripcion><lote>${lote}</lote></respuesta></comunicacionResponse>`;
      return { ok: true, codigo: '0', descripcion: 'Ok', lote, rawResponse: mock };
    }

    try {
      const solicitudZipB64 = await zipAndBase64(params.xmlAlta);
      const soapXml = buildSoapComunicacionRequest(this.cfg, solicitudZipB64);

      console.log('📤 Enviando SOAP al MIR (oficial):', {
        url: this.cfg.baseUrl,
        username: this.cfg.username,
        codigoArrendador: this.cfg.codigoArrendador,
        operation: MIR_OPERATIONS.COMUNICACION,
        bodyLength: soapXml.length
      });

      const res = await makeSoapRequest(this.cfg, soapXml, MIR_OPERATIONS.COMUNICACION);

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
          debugSoap: process.env.MIR_DEBUG_SOAP === 'true' ? soapXml : undefined
        };
      }

      const parsed = parseAltaResponse(text);
      console.log('✅ Respuesta parseada:', parsed);

      return { 
        ...parsed, 
        rawResponse: text,
        debugSoap: process.env.MIR_DEBUG_SOAP === 'true' ? soapXml : undefined
      };

    } catch (error) {
      console.error('❌ Error en altaPV:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          ok: false,
          codigo: 'TIMEOUT',
          descripcion: 'Timeout en la conexión con el MIR',
          rawResponse: ''
        };
      }
      
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

  async consultaComunicacion(params: ConsultaComunicacionParams): Promise<ConsultaComunicacionResult> {
    if (this.cfg.simulacion) {
      const mock = `<consultaComunicacionResponse><resultado><codigo>0</codigo><descripcion>Ok</descripcion></resultado></consultaComunicacionResponse>`;
      return { 
        ok: true, 
        codigo: '0', 
        descripcion: 'Ok', 
        comunicaciones: [],
        rawResponse: mock 
      };
    }

    try {
      const soapXml = buildSoapConsultaComunicacionRequest(this.cfg, params.codigos);

      console.log('📤 Consultando comunicaciones al MIR:', {
        url: this.cfg.baseUrl,
        codigos: params.codigos,
        operation: MIR_OPERATIONS.CONSULTA_COMUNICACION
      });

      const res = await makeSoapRequest(this.cfg, soapXml, MIR_OPERATIONS.CONSULTA_COMUNICACION);

      const text = await res.text();
      console.log('📋 Respuesta consulta (primeros 1000 chars):', text.substring(0, 1000));

      if (!res.ok) {
        return {
          ok: false,
          codigo: res.status.toString(),
          descripcion: `HTTP ${res.status}: ${res.statusText}`,
          comunicaciones: [],
          rawResponse: text
        };
      }

      return parseConsultaResponse(text);

    } catch (error) {
      console.error('❌ Error en consultaComunicacion:', error);
      return {
        ok: false,
        codigo: 'ERROR',
        descripcion: error instanceof Error ? error.message : 'Error desconocido',
        comunicaciones: [],
        rawResponse: ''
      };
    }
  }

  async anulacionLote(params: AnulacionLoteParams): Promise<AnulacionLoteResult> {
    if (this.cfg.simulacion) {
      const mock = `<anulacionLoteResponse><codigo>0</codigo><descripcion>Lote anulado correctamente</descripcion></anulacionLoteResponse>`;
      return { 
        ok: true, 
        codigo: '0', 
        descripcion: 'Lote anulado correctamente', 
        rawResponse: mock 
      };
    }

    try {
      const soapXml = buildSoapAnulacionLoteRequest(this.cfg, params.lote);

      console.log('📤 Anulando lote al MIR:', {
        url: this.cfg.baseUrl,
        lote: params.lote,
        operation: MIR_OPERATIONS.ANULACION_LOTE
      });

      const res = await makeSoapRequest(this.cfg, soapXml, MIR_OPERATIONS.ANULACION_LOTE);

      const text = await res.text();
      console.log('📋 Respuesta anulación (primeros 1000 chars):', text.substring(0, 1000));

      if (!res.ok) {
        return {
          ok: false,
          codigo: res.status.toString(),
          descripcion: `HTTP ${res.status}: ${res.statusText}`,
          rawResponse: text
        };
      }

      return parseAnulacionResponse(text);

    } catch (error) {
      console.error('❌ Error en anulacionLote:', error);
      return {
        ok: false,
        codigo: 'ERROR',
        descripcion: error instanceof Error ? error.message : 'Error desconocido',
        rawResponse: ''
      };
    }
  }

  async consultaCatalogo(params: ConsultaCatalogoParams): Promise<ConsultaCatalogoResult> {
    if (this.cfg.simulacion) {
      const mock = `<catalogoResponse><resultado><codigo>0</codigo><descripcion>Ok</descripcion></resultado><respuesta><resultado><tupla><codigo>NIF</codigo><descripcion>Número de Identificación Fiscal</descripcion></tupla></resultado></respuesta></catalogoResponse>`;
      return { 
        ok: true, 
        codigo: '0', 
        descripcion: 'Ok', 
        elementos: [
          { codigo: 'NIF', descripcion: 'Número de Identificación Fiscal' },
          { codigo: 'NIE', descripcion: 'Número de Identidad de Extranjero' },
          { codigo: 'PAS', descripcion: 'Pasaporte' }
        ],
        rawResponse: mock 
      };
    }

    try {
      const soapXml = buildSoapCatalogoRequest(this.cfg, params.catalogo);

      console.log('📤 Consultando catálogo al MIR:', {
        url: this.cfg.baseUrl,
        catalogo: params.catalogo,
        operation: MIR_OPERATIONS.CATALOGO
      });

      const res = await makeSoapRequest(this.cfg, soapXml, MIR_OPERATIONS.CATALOGO);

      const text = await res.text();
      console.log('📋 Respuesta catálogo (primeros 1000 chars):', text.substring(0, 1000));

      if (!res.ok) {
        return {
          ok: false,
          codigo: res.status.toString(),
          descripcion: `HTTP ${res.status}: ${res.statusText}`,
          elementos: [],
          rawResponse: text
        };
      }

      return parseCatalogoResponse(text);

    } catch (error) {
      console.error('❌ Error en consultaCatalogo:', error);
      return {
        ok: false,
        codigo: 'ERROR',
        descripcion: error instanceof Error ? error.message : 'Error desconocido',
        elementos: [],
        rawResponse: ''
      };
    }
  }
}

export function getMinisterioConfigFromEnv(): MinisterioConfig {
  const hasRequiredVars = !!(
    process.env.MIR_BASE_URL &&
    process.env.MIR_HTTP_USER &&
    process.env.MIR_HTTP_PASS &&
    process.env.MIR_CODIGO_ARRENDADOR
  );
  
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
    simulacion
  };
}
