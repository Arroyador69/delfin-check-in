// Cliente del Servicio de Comunicación del MIR (Partes de Viajeros - PV)
// Requisitos: SOAP/XML, solicitud ZIP + Base64, Autenticación HTTP Basic, flujo asíncrono con lote

import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export interface MinisterioConfig {
  baseUrl: string; // URL del servicio SOAP (entorno producción o pruebas)
  username: string; // Credenciales HTTP Basic - usuario
  password: string; // Credenciales HTTP Basic - contraseña
  codigoArrendador: string; // Código asignado por el sistema
  aplicacion: string; // Nombre de la aplicación (<= 50 chars)
  simulacion?: boolean; // Si true, no envía al MIR; devuelve respuestas mock
}

export interface AltaPVParams {
  xmlAlta: string; // XML del alta <peticion><solicitud>...</solicitud></peticion>
}

export interface ConsultaLoteParams {
  lotes: string[]; // Hasta 10 lotes por petición
}

export interface AltaPVResult {
  ok: boolean;
  codigo: string; // código respuesta (p.ej. "0")
  descripcion: string; // descripción (p.ej. "Ok")
  lote?: string; // identificador de lote si ok
  rawResponse: string; // XML de respuesta
}

export interface ConsultaLoteResult {
  ok: boolean;
  codigo: string;
  descripcion: string;
  resultados?: Array<{
    lote: string;
    codigoEstado: string; // 1,4,5,6...
    resultadoComunicaciones?: Array<{
      indice: number; // orden de envío (1..n)
      codigoComunicacion?: string; // presente si correcta
      tipoError?: string;
      error?: string;
    }>;
  }>;
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

function buildSoapEnvelopeConsultaLote(cfg: MinisterioConfig, lotes: string[]): string {
  const solicitudXml = `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
  <solicitud>
    ${lotes.map((l) => `<lote>${escapeXml(l)}</lote>`).join('')}
  </solicitud>
</peticion>`;
  const cabecera = `
    <cabecera>
      <codigoArrendador>${escapeXml(cfg.codigoArrendador)}</codigoArrendador>
      <aplicacion>${escapeXml(cfg.aplicacion).slice(0, 50)}</aplicacion>
      <tipoOperacion>C</tipoOperacion>
      <tipoComunicacion>PV</tipoComunicacion>
    </cabecera>`;
  return wrapSoapEnvelope(`<peticion>${cabecera}<solicitud>${safeB64(solicitudXml)}</solicitud></peticion>`);
}

function wrapSoapEnvelope(innerXml: string): string {
  // En muchos servicios se usa SOAP 1.1 con Content-Type text/xml; charset=utf-8
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    ${innerXml}
  </soapenv:Body>
</soapenv:Envelope>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeB64(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64');
}

export class MinisterioClient {
  constructor(private readonly cfg: MinisterioConfig) {}

  async altaPV(params: AltaPVParams): Promise<AltaPVResult> {
    if (this.cfg.simulacion) {
      const lote = `SIM-${Date.now()}`;
      const mock = `<consultaResponse><codigo>0</codigo><descripcion>Ok</descripcion><lote>${lote}</lote></consultaResponse>`;
      return { ok: true, codigo: '0', descripcion: 'Ok', lote, rawResponse: mock };
    }

    const solicitudZipB64 = await zipAndBase64(params.xmlAlta);
    const soapXml = buildSoapEnvelopeComunicacionA(this.cfg, solicitudZipB64);

    const res = await fetch(this.cfg.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': buildBasicAuthHeader(this.cfg.username, this.cfg.password),
        'Content-Type': 'text/xml; charset=utf-8',
        'User-Agent': 'Delfin_Check_in/1.0'
      },
      body: soapXml,
      // Configuración para SSL y certificados
      signal: AbortSignal.timeout(30000), // 30 segundos timeout
      // Usar configuración SSL optimizada para MIR
      // @ts-ignore
      agent: new (require('https').Agent)(getMirAgentConfig())
    });
    const text = await res.text();
    const parsed = parseAltaResponse(text);
    return { ...parsed, rawResponse: text };
  }

  async consultaLote(params: ConsultaLoteParams): Promise<ConsultaLoteResult> {
    if (this.cfg.simulacion) {
      const resultados = params.lotes.map((l) => ({
        lote: l,
        codigoEstado: '1',
        resultadoComunicaciones: [
          { indice: 1, codigoComunicacion: `PV-${Date.now()}` }
        ]
      }));
      const mock = `<consultaLoteResponse><codigo>0</codigo><descripcion>Ok</descripcion></consultaLoteResponse>`;
      return { ok: true, codigo: '0', descripcion: 'Ok', resultados, rawResponse: mock };
    }

    const soapXml = buildSoapEnvelopeConsultaLote(this.cfg, params.lotes);
    const res = await fetch(this.cfg.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': buildBasicAuthHeader(this.cfg.username, this.cfg.password),
        'Content-Type': 'text/xml; charset=utf-8',
        'User-Agent': 'Delfin_Check_in/1.0'
      },
      body: soapXml,
      // Configuración para SSL y certificados
      signal: AbortSignal.timeout(30000), // 30 segundos timeout
      // Usar configuración SSL optimizada para MIR
      // @ts-ignore
      agent: new (require('https').Agent)(getMirAgentConfig())
    });
    const text = await res.text();
    const parsed = parseConsultaLoteResponse(text);
    return { ...parsed, rawResponse: text };
  }
}

function parseAltaResponse(xml: string): { ok: boolean; codigo: string; descripcion: string; lote?: string } {
  // Parser simple basado en búsqueda; en producción usar XML parser robusto
  const codigo = matchTag(xml, 'codigo') || '';
  const descripcion = matchTag(xml, 'descripcion') || '';
  const lote = matchTag(xml, 'lote') || undefined;
  const ok = codigo === '0';
  return { ok, codigo, descripcion, lote };
}

function parseConsultaLoteResponse(xml: string): {
  ok: boolean; codigo: string; descripcion: string; resultados?: ConsultaLoteResult['resultados']
} {
  const codigo = matchTag(xml, 'codigo') || '';
  const descripcion = matchTag(xml, 'descripcion') || '';
  // Para simplificar, devolvemos sólo códigoEstado global si aparece
  const lotes: ConsultaLoteResult['resultados'] = [];
  const loteMatches = [...xml.matchAll(/<lote>(.*?)<\/lote>/g)];
  if (loteMatches.length) {
    for (const m of loteMatches) {
      const loteId = m[1];
      // Intentar extraer codigoEstado dentro del bloque de ese lote
      const blockRegex = new RegExp(`<lote>${escapeRegExp(loteId)}<\/lote>[\s\S]*?<codigoEstado>(\d+)<\/codigoEstado>`, 'm');
      const block = xml.match(blockRegex);
      const codigoEstado = block?.[1] || '4';
      lotes.push({ lote: loteId, codigoEstado });
    }
  }
  const ok = codigo === '0';
  return { ok, codigo, descripcion, resultados: lotes };
}

function matchTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`));
  return m ? m[1].trim() : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMirServerCertificate(): string {
  try {
    // Intentar cargar el certificado del servidor MIR
    const certPath = path.join(process.cwd(), 'mir-server-cert.pem');
    if (fs.existsSync(certPath)) {
      const cert = fs.readFileSync(certPath, 'utf8');
      console.log('✅ Certificado MIR cargado correctamente');
      return cert;
    }
    
    // Si no existe, usar certificado por defecto (puede fallar)
    console.warn('⚠️ Certificado del servidor MIR no encontrado en:', certPath);
    return '';
  } catch (error) {
    console.error('❌ Error cargando certificado MIR:', error);
    return '';
  }
}

function getMirAgentConfig(): any {
  const cert = getMirServerCertificate();
  
  if (cert) {
    // Usar certificado del servidor MIR
    return {
      ca: cert,
      rejectUnauthorized: true
    };
  } else {
    // Fallback: permitir certificados no verificados (solo para desarrollo)
    console.warn('⚠️ Usando configuración SSL permisiva (solo para desarrollo)');
    return {
      rejectUnauthorized: false
    };
  }
}

export function getMinisterioConfigFromEnv(): MinisterioConfig {
  return {
    baseUrl: process.env.MIR_BASE_URL || 'https://example.mir/soap',
    username: process.env.MIR_HTTP_USER || '',
    password: process.env.MIR_HTTP_PASS || '',
    codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
    aplicacion: process.env.MIR_APLICACION || 'Delfin Check-in',
    simulacion: process.env.MIR_SIMULACION === 'true'
  };
}



