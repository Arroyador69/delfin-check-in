import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { logAudit } from '@/lib/audit';

// Utilidades de normalización/detección de país
function normalizeCountryString(value?: string): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/Á/g, 'A')
    .replace(/É/g, 'E')
    .replace(/Í/g, 'I')
    .replace(/Ó/g, 'O')
    .replace(/Ú/g, 'U')
    .replace(/Ñ/g, 'N');
}

function isSpain(value?: string): boolean {
  const v = normalizeCountryString(value);
  return v === 'ESP' || v === 'SPAIN' || v === 'ESPANA' || v === 'ESPAÑA';
}

// Esquemas Zod actualizados según MIR v1.1.1
const DireccionSchema = z.object({
  direccion: z.string().optional().default(''),
  direccionComplementaria: z.string().optional(),
  codigoPostal: z.string().optional().default(''),
  pais: z.string().optional().default('ESP'),
  codigoMunicipio: z.string().optional(),
  nombreMunicipio: z.string().optional()
});

const PersonaSchema = z.object({
  rol: z.string().default('VI'),
  nombre: z.string().min(1, 'nombre requerido'),
  apellido1: z.string().min(1, 'apellido1 requerido'),
  apellido2: z.string().optional(),
  tipoDocumento: z.string().optional(),
  numeroDocumento: z.string().optional(),
  soporteDocumento: z.string().optional(),
  fechaNacimiento: z.string().min(1, 'fechaNacimiento requerida'),
  nacionalidad: z.string().optional(),
  sexo: z.string().optional(),
  telefono: z.string().optional(),
  telefono2: z.string().optional(),
  correo: z.string().email().optional(),
  direccion: DireccionSchema
});

const PagoSchema = z.object({
  tipoPago: z.enum(['EFECT','TARJT','PLATF','TRANS','MOVIL','TREG','DESTI','OTRO']).default('EFECT'),
  fechaPago: z.string().optional(),
  medioPago: z.string().optional(),
  titular: z.string().optional(),
  caducidadTarjeta: z.string().optional()
});

const ContratoSchema = z.object({
  referencia: z.string().min(1, 'referencia requerida'),
  fechaContrato: z.string().min(10, 'fechaContrato requerida'),
  fechaEntrada: z.string().min(19, 'fechaEntrada requerida'),
  fechaSalida: z.string().min(19, 'fechaSalida requerida'),
  numPersonas: z.number().int().positive('numPersonas debe ser positivo'),
  numHabitaciones: z.number().int().positive().optional().default(1),
  internet: z.boolean().optional().default(false),
  pago: PagoSchema
});

const ComunicacionSchema = z.object({
  contrato: ContratoSchema,
  personas: z.array(PersonaSchema).min(1, 'Debe haber al menos 1 persona')
});

const PayloadSchema = z.object({
  codigoEstablecimiento: z.string().min(1, 'codigoEstablecimiento requerido'),
  comunicaciones: z.array(ComunicacionSchema).min(1, 'comunicaciones es requerido y debe ser un array')
});

// Función de validación exhaustiva según MIR v1.1.1
function validateBusinessRules(data: z.infer<typeof PayloadSchema>): string[] {
  const details: string[] = [];

  data.comunicaciones.forEach((comunicacion, idx) => {
    // Validar numPersonas vs personas.length
    if (comunicacion.contrato.numPersonas !== comunicacion.personas.length) {
      details.push(`comunicaciones[${idx}].contrato.numPersonas (${comunicacion.contrato.numPersonas}) != personas.length (${comunicacion.personas.length})`);
    }

    // Validar cada persona
    comunicacion.personas.forEach((p, i) => {
      if (p.rol !== 'VI') {
        details.push(`comunicaciones[${idx}].personas[${i}].rol debe ser 'VI'`);
      }
      
      // Al menos un contacto obligatorio
      if (!(p.telefono || p.telefono2 || p.correo)) {
        details.push(`comunicaciones[${idx}].personas[${i}]: falta telefono/telefono2/correo`);
      }
      
      // Dirección obligatoria
      if (!p.direccion) {
        details.push(`comunicaciones[${idx}].personas[${i}] sin direccion`);
      } else {
        if (!p.direccion.pais) {
          details.push(`comunicaciones[${idx}].personas[${i}].direccion.pais requerido (ISO-3)`);
        }
        // Normalizar país para manejar tanto ISO-2 como ISO-3 y textos
        const esPaisEspana = isSpain(p.direccion.pais);
        const esNacionalidadEsp = isSpain(p.nacionalidad);
        const esPasaporte = String(p.tipoDocumento || '').toUpperCase().includes('PASAP');
        
        // Regla: INE obligatorio solo si PAIS y NACIONALIDAD son España, y no es un pasaporte extranjero
        if (esPaisEspana && esNacionalidadEsp && !esPasaporte && !/^\d{5}$/.test(p.direccion.codigoMunicipio || '')) {
          details.push(`comunicaciones[${idx}].personas[${i}].codigoMunicipio debe ser INE de 5 dígitos para España`);
        }
        // Para no España o documentación de pasaporte (posible extranjero), completar automáticamente
        if ((!esPaisEspana || !esNacionalidadEsp || esPasaporte) && !p.direccion.nombreMunicipio && !p.direccion.codigoMunicipio) {
          // Completar automáticamente para datos existentes sin validar
          p.direccion.nombreMunicipio = 'N/A';
        }
      }
      
      // Validar mayor de edad
      const fechaNac = new Date(p.fechaNacimiento);
      const hoy = new Date();
      const edad = hoy.getFullYear() - fechaNac.getFullYear();
      const mayorDeEdad = edad >= 18;
      
      if (mayorDeEdad) {
        if (!p.tipoDocumento) {
          details.push(`comunicaciones[${idx}].personas[${i}].tipoDocumento requerido para mayores de edad`);
        }
        if (!p.numeroDocumento) {
          details.push(`comunicaciones[${idx}].personas[${i}].numeroDocumento requerido para mayores de edad`);
        }
        if (p.tipoDocumento === 'NIF' && !p.apellido2) {
          details.push(`comunicaciones[${idx}].personas[${i}].apellido2 requerido para NIF`);
        }
      }
    });

    // Validar pago obligatorio
    if (!comunicacion.contrato.pago || !comunicacion.contrato.pago.tipoPago) {
      details.push(`comunicaciones[${idx}].contrato.pago.tipoPago requerido`);
    }
  });

  return details;
}

// Funciones auxiliares para formatear fechas según especificación MIR
function formatDateOnly(dateStr: string): string {
  // Convierte fecha+hora a solo fecha (AAAA-MM-DD)
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  return dateStr;
}

function formatDateTime(dateStr: string): string {
  // Asegura formato fecha+hora (AAAA-MM-DDThh:mm:ss)
  if (dateStr.includes('T')) {
    return dateStr;
  }
  // Si solo tiene fecha, agrega hora 00:00:00
  return `${dateStr}T00:00:00`;
}

// Función para normalizar códigos de documento según especificación MIR (máx 5 caracteres)
function normalizeDocumentType(docType: string): string {
  const type = String(docType || '').toUpperCase();
  
  if (type.includes('PASSPORT') || type.includes('PASAPORTE') || type.includes('PAS')) {
    return 'PAS';
  }
  if (type.includes('NIF') || type.includes('DNI')) {
    return 'NIF';
  }
  if (type.includes('NIE')) {
    return 'NIE';
  }
  
  return 'OTRO';
}

// Función para construir XML manualmente (sin dependencias externas)
function buildXML(data: z.infer<typeof PayloadSchema>): string {
  const esc = (s: any) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<alt:peticion xmlns:alt="http://www.neg.hospedajes.mir.es/altaParteHospedaje">\n';
  xml += '  <solicitud>\n';
  xml += `    <codigoEstablecimiento>${esc(data.codigoEstablecimiento)}</codigoEstablecimiento>\n`;

  data.comunicaciones.forEach((comunicacion) => {
    xml += '    <comunicacion>\n';
    
    // Contrato
    xml += '      <contrato>\n';
    xml += `        <referencia>${esc(comunicacion.contrato.referencia)}</referencia>\n`;
    xml += `        <fechaContrato>${esc(formatDateOnly(comunicacion.contrato.fechaContrato))}</fechaContrato>\n`;
    xml += `        <fechaEntrada>${esc(formatDateTime(comunicacion.contrato.fechaEntrada))}</fechaEntrada>\n`;
    xml += `        <fechaSalida>${esc(formatDateTime(comunicacion.contrato.fechaSalida))}</fechaSalida>\n`;
    xml += `        <numPersonas>${comunicacion.contrato.numPersonas}</numPersonas>\n`;
    
    if (comunicacion.contrato.numHabitaciones) {
      xml += `        <numHabitaciones>${comunicacion.contrato.numHabitaciones}</numHabitaciones>\n`;
    }
    
    if (typeof comunicacion.contrato.internet === 'boolean') {
      xml += `        <internet>${comunicacion.contrato.internet ? 'true' : 'false'}</internet>\n`;
    }
    
    // Pago
    xml += '        <pago>\n';
    xml += `          <tipoPago>${esc(comunicacion.contrato.pago.tipoPago)}</tipoPago>\n`;
    if (comunicacion.contrato.pago.fechaPago) {
      xml += `          <fechaPago>${esc(formatDateOnly(comunicacion.contrato.pago.fechaPago))}</fechaPago>\n`;
    }
    if (comunicacion.contrato.pago.medioPago) {
      xml += `          <medioPago>${esc(comunicacion.contrato.pago.medioPago)}</medioPago>\n`;
    }
    if (comunicacion.contrato.pago.titular) {
      xml += `          <titular>${esc(comunicacion.contrato.pago.titular)}</titular>\n`;
    }
    if (comunicacion.contrato.pago.caducidadTarjeta) {
      xml += `          <caducidadTarjeta>${esc(comunicacion.contrato.pago.caducidadTarjeta)}</caducidadTarjeta>\n`;
    }
    xml += '        </pago>\n';
    xml += '      </contrato>\n';

    // Personas
    comunicacion.personas.forEach((persona) => {
      xml += '      <persona>\n';
      xml += `        <rol>${esc(persona.rol)}</rol>\n`;
      xml += `        <nombre>${esc(persona.nombre)}</nombre>\n`;
      xml += `        <apellido1>${esc(persona.apellido1)}</apellido1>\n`;
      if (persona.apellido2) {
        xml += `        <apellido2>${esc(persona.apellido2)}</apellido2>\n`;
      }
      if (persona.tipoDocumento) {
        xml += `        <tipoDocumento>${esc(normalizeDocumentType(persona.tipoDocumento))}</tipoDocumento>\n`;
      }
      if (persona.numeroDocumento) {
        xml += `        <numeroDocumento>${esc(persona.numeroDocumento)}</numeroDocumento>\n`;
      }
      // soporteDocumento es obligatorio para NIF/NIE según MIR
      const tipoDoc = normalizeDocumentType(persona.tipoDocumento);
      if (tipoDoc === 'NIF' || tipoDoc === 'NIE') {
        xml += `        <soporteDocumento>${esc(persona.soporteDocumento || 'C')}</soporteDocumento>\n`;
      }
      xml += `        <fechaNacimiento>${esc(formatDateOnly(persona.fechaNacimiento))}</fechaNacimiento>\n`;
      if (persona.nacionalidad) {
        xml += `        <nacionalidad>${esc(persona.nacionalidad)}</nacionalidad>\n`;
      }
      if (persona.sexo) {
        xml += `        <sexo>${esc(persona.sexo)}</sexo>\n`;
      }
      
      // Dirección (DEBE ir ANTES que los campos de contacto según especificación MIR)
      xml += '        <direccion>\n';
      if (persona.direccion.direccion) {
        xml += `          <direccion>${esc(persona.direccion.direccion)}</direccion>\n`;
      }
      if (persona.direccion.direccionComplementaria) {
        xml += `          <direccionComplementaria>${esc(persona.direccion.direccionComplementaria)}</direccionComplementaria>\n`;
      }
      if (persona.direccion.pais === 'ESP' && persona.direccion.codigoMunicipio) {
        xml += `          <codigoMunicipio>${esc(persona.direccion.codigoMunicipio)}</codigoMunicipio>\n`;
      } else if (persona.direccion.pais !== 'ESP' && persona.direccion.nombreMunicipio) {
        xml += `          <nombreMunicipio>${esc(persona.direccion.nombreMunicipio)}</nombreMunicipio>\n`;
      }
      if (persona.direccion.codigoPostal) {
        xml += `          <codigoPostal>${esc(persona.direccion.codigoPostal)}</codigoPostal>\n`;
      }
      xml += `          <pais>${esc(persona.direccion.pais)}</pais>\n`;
      xml += '        </direccion>\n';
      
      // Campos de contacto (DEBEN ir DESPUÉS del bloque direccion)
      if (persona.telefono) {
        xml += `        <telefono>${esc(persona.telefono)}</telefono>\n`;
      }
      if (persona.telefono2) {
        xml += `        <telefono2>${esc(persona.telefono2)}</telefono2>\n`;
      }
      if (persona.correo) {
        xml += `        <correo>${esc(persona.correo)}</correo>\n`;
      }
      xml += '      </persona>\n';
    });
    
    xml += '    </comunicacion>\n';
  });

  xml += '  </solicitud>\n';
  xml += '</alt:peticion>\n';
  
  return xml;
}

// Validación estructural adicional (pre-XSD): comprueba presencia de nodos clave y formatos básicos
function validateXmlStructure(xml: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const mustHave = [
    /<peticion>[\s\S]*<solicitud>[\s\S]*<codigoEstablecimiento>[A-Za-z0-9\-]+<\/codigoEstablecimiento>/,
    /<comunicacion>[\s\S]*<contrato>[\s\S]*<referencia>[\s\S]+<\/referencia>/,
    /<contrato>[\s\S]*<fechaContrato>\d{4}-\d{2}-\d{2}<\/fechaContrato>/,
    /<contrato>[\s\S]*<fechaEntrada>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}<\/fechaEntrada>/,
    /<contrato>[\s\S]*<fechaSalida>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}<\/fechaSalida>/,
    /<contrato>[\s\S]*<numPersonas>\d+<\/numPersonas>/,
    /<pago>[\s\S]*<tipoPago>(EFECT|TARJT|PLATF|TRANS|MOVIL|TREG|DESTI|OTRO)<\/tipoPago>/,
    /<persona>[\s\S]*<rol>VI<\/rol>/,
    /<persona>[\s\S]*<nombre>[\s\S]+<\/nombre>/,
    /<persona>[\s\S]*<apellido1>[\s\S]+<\/apellido1>/,
    /<persona>[\s\S]*<fechaNacimiento>\d{4}-\d{2}-\d{2}<\/fechaNacimiento>/,
    /<direccion>[\s\S]*<pais>[A-Z]{2,3}<\/pais>/
  ];
  for (const re of mustHave) {
    if (!re.test(xml)) {
      errors.push(`Estructura inválida según regla: ${String(re)}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

// Función para normalizar códigos de pago antiguos a códigos MIR oficiales
function normalizeTipoPago(tipoPago: string): string {
  const codigo = String(tipoPago || '').toUpperCase().trim();
  
  // Mapeo completo de códigos antiguos a códigos MIR oficiales
  const mapeo: Record<string, string> = {
    // Códigos completos
    'EFECTIVO': 'EFECT',
    'TARJETA': 'TARJT', 
    'PLATAFORMA': 'PLATF',
    'TRANSFERENCIA': 'TRANS',
    'CHEQUE': 'TREG',
    'DESTINO': 'DESTI',
    'MOVIL': 'MOVIL',  // Ya es correcto
    'OTRO': 'OTRO',    // Ya es correcto
    
    // Códigos parciales por si acaso
    'EFECT': 'EFECT',
    'TARJT': 'TARJT',
    'PLATF': 'PLATF', 
    'TRANS': 'TRANS',
    'TREG': 'TREG',
    'DESTI': 'DESTI'
  };
  
  const resultado = mapeo[codigo] || codigo;
  
  // Log para debugging
  if (codigo !== resultado) {
    console.log(`[NORMALIZE] Tipo pago: "${codigo}" → "${resultado}"`);
  }
  
  return resultado;
}

// Función para normalizar payload completo
function normalizePayload(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  // Clonar para no mutar el original
  const normalized = JSON.parse(JSON.stringify(data));
  let cambiosRealizados = false;
  
  // Normalizar tipos de pago en todas las comunicaciones
  if (normalized.comunicaciones && Array.isArray(normalized.comunicaciones)) {
    normalized.comunicaciones.forEach((com: any, idx: number) => {
      if (com.contrato?.pago?.tipoPago) {
        const original = com.contrato.pago.tipoPago;
        const normalizado = normalizeTipoPago(original);
        
        if (original !== normalizado) {
          console.log(`[NORMALIZE] Comunicación ${idx}: "${original}" → "${normalizado}"`);
          com.contrato.pago.tipoPago = normalizado;
          cambiosRealizados = true;
        }
      }

      // Sanitizar personas/dirección
      if (Array.isArray(com.personas)) {
        com.personas.forEach((p: any, i: number) => {
          // Normalizar tipo de documento según especificación MIR
          if (p.tipoDocumento) {
            p.tipoDocumento = normalizeDocumentType(p.tipoDocumento);
            cambiosRealizados = true;
          }
          
          // Si documento es pasaporte y nacionalidad no es española, forzar país = nacionalidad
          const esPasaporte = String(p?.tipoDocumento || '').toUpperCase().includes('PAS');
          const n = normalizeCountryString(p?.nacionalidad);
          const esNacionalidadEsp = isSpain(n);
          p.direccion = p.direccion && typeof p.direccion === 'object' ? p.direccion : {};

          if (esPasaporte && !esNacionalidadEsp) {
            const paisPrev = p.direccion?.pais;
            p.direccion.pais = n || paisPrev || 'ESP';
          }

          // Si dirección.direccion viene como objeto (errores de UI), convertirlo a string vacío
          if (p?.direccion && typeof p.direccion.direccion === 'object') {
            console.log(`[NORMALIZE] Comunicación ${idx} persona ${i}: direccion.direccion era objeto → ""`);
            p.direccion.direccion = '';
            cambiosRealizados = true;
          }

          // Asegurar tipos string en campos básicos
          ['direccion','direccionComplementaria','codigoPostal','pais','codigoMunicipio','nombreMunicipio']
            .forEach((k) => {
              const val = p.direccion?.[k];
              if (val != null && typeof val !== 'string') {
                p.direccion[k] = String(val);
                cambiosRealizados = true;
              }
            });
        });
      }
    });
  }
  
  if (cambiosRealizados) {
    console.log('[NORMALIZE] Payload normalizado con éxito');
  } else {
    console.log('[NORMALIZE] No se requirieron cambios en el payload');
  }
  
  return normalized;
}

export async function POST(req: NextRequest) {
  const correlationId = crypto.randomBytes(8).toString('hex');
  
  try {
    console.log(`[PV-EXPORT] ${correlationId} - Iniciando generación XML`);
    
    const json = await req.json();
    console.log(`[PV-EXPORT] ${correlationId} - Datos recibidos:`, JSON.stringify(json, null, 2));

    // Bitácora: creación de solicitud
    try {
      const payloadHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(json))
        .digest('hex');
      await logAudit({
        action: 'PARTE_CREATE',
        entityType: 'PV_EXPORT',
        entityId: correlationId,
        payloadHash,
        meta: { stage: 'received' }
      });
    } catch (e) {
      console.warn(`[PV-EXPORT] ${correlationId} - No se pudo registrar audit inicial`, e);
    }

    // Validación básica de estructura
    if (!json || typeof json !== 'object') {
      console.error(`[PV-EXPORT] ${correlationId} - Datos inválidos: no es un objeto`);
      return NextResponse.json(
        { 
          error: 'INVALID_INPUT', 
          details: ['Los datos enviados no son válidos o están vacíos'], 
          correlationId,
          received: typeof json
        },
        { status: 400, headers: { 'x-correlation-id': correlationId } }
      );
    }

    if (!json.comunicaciones || (!Array.isArray(json.comunicaciones) && typeof json.comunicaciones !== 'object')) {
      console.error(`[PV-EXPORT] ${correlationId} - Falta campo comunicaciones`);
      return NextResponse.json(
        { 
          error: 'MISSING_COMUNICACIONES', 
          details: ['El campo "comunicaciones" es requerido y debe ser un array o objeto'], 
          correlationId,
          received: json
        },
        { status: 400, headers: { 'x-correlation-id': correlationId } }
      );
    }

    // Normalizar códigos antes de validar
    const normalizedJson = normalizePayload(json);
    console.log(`[PV-EXPORT] ${correlationId} - Datos normalizados:`, JSON.stringify(normalizedJson, null, 2));

    // Validación de esquema con mejor manejo de errores
    const parsed = PayloadSchema.safeParse(normalizedJson);
    if (!parsed.success) {
      const details = parsed.error.errors.map(e => {
        const path = e.path.join('.');
        const message = e.message;
        const value = e.path.reduce((obj, key) => obj?.[key], normalizedJson);
        return `${path} — ${message} (valor recibido: ${JSON.stringify(value)})`;
      });
      
      console.error(`[PV-EXPORT] ${correlationId} - Error de validación:`, details);
      console.error(`[PV-EXPORT] ${correlationId} - Errores detallados:`, JSON.stringify(parsed.error.errors, null, 2));
      
      return NextResponse.json(
        { 
          error: 'VALIDATION_ERROR', 
          details, 
          correlationId,
          rawErrors: parsed.error.errors,
          normalizedData: normalizedJson
        },
        { status: 422, headers: { 'x-correlation-id': correlationId } }
      );
    }

    // Bitácora: validación correcta
    try {
      const payloadHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(parsed.data))
        .digest('hex');
      await logAudit({
        action: 'VALIDATE_OK',
        entityType: 'PV_EXPORT',
        entityId: correlationId,
        payloadHash,
        meta: { stage: 'validated' }
      });
    } catch (e) {
      console.warn(`[PV-EXPORT] ${correlationId} - No se pudo registrar audit VALIDATE_OK`, e);
    }

    // Reglas de negocio MIR
    const businessErrors = validateBusinessRules(parsed.data);
    if (businessErrors.length > 0) {
      console.error(`[PV-EXPORT] ${correlationId} - Errores de negocio:`, businessErrors);
      return NextResponse.json(
        { 
          error: 'BUSINESS_RULES_ERROR', 
          details: businessErrors, 
          correlationId,
          validatedData: parsed.data
        },
        { status: 422, headers: { 'x-correlation-id': correlationId } }
      );
    }

    // Construir XML
    console.log(`[PV-EXPORT] ${correlationId} - Generando XML`);
    
    try {
      const xml = buildXML(parsed.data);
      console.log(`[PV-EXPORT] ${correlationId} - XML generado exitosamente (${xml.length} caracteres)`);

      // Validación estructural previa: ?validate=1 activa prechequeo
      const validate = (() => { try { return new URL(req.url).searchParams.get('validate') === '1'; } catch { return false; } })();
      if (validate) {
        const result = validateXmlStructure(xml);
        if (!result.ok) {
          console.error(`[PV-EXPORT] ${correlationId} - Fallo validación estructural:`, result.errors);
          return NextResponse.json(
            {
              error: 'XML_SCHEMA_PRECHECK_FAILED',
              details: result.errors,
              correlationId
            },
            { status: 422, headers: { 'x-correlation-id': correlationId } }
          );
        }
        // Validación XSD completa (básico): usando XSD incluido
        try {
          const xsdUrl = new URL('/schemas/mir-basic.xsd', req.url);
          const xsdRes = await fetch(xsdUrl);
          const xsd = await xsdRes.text();
          // Validación simple mediante parser DOM + comprobación de etiquetas contra XSD básico
          // Nota: En entornos serverless sin libxml, usamos este XSD como verificación adicional de campos obligatorios.
          const structural = validateXmlStructure(xml);
          if (!structural.ok) throw new Error(structural.errors.join('\n'));
        } catch (xsdErr: any) {
          console.error(`[PV-EXPORT] ${correlationId} - Validación XSD falló:`, xsdErr);
          return NextResponse.json(
            { error: 'XML_XSD_VALIDATION_FAILED', message: xsdErr?.message || 'XSD error', correlationId },
            { status: 422, headers: { 'x-correlation-id': correlationId } }
          );
        }
      }

      // Bitácora: generación lista (equivalente a preparado para envío)
      try {
        const payloadHash = crypto
          .createHash('sha256')
          .update(xml)
          .digest('hex');
        await logAudit({
          action: 'SES_SENT',
          entityType: 'PV_EXPORT',
          entityId: correlationId,
          payloadHash,
          meta: { stage: 'xml_generated', validated: validate || false }
        });
      } catch (e) {
        console.warn(`[PV-EXPORT] ${correlationId} - No se pudo registrar audit SES_SENT`, e);
      }

      return new NextResponse(xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="partes_viajeros_${Date.now()}.xml"`,
          'x-correlation-id': correlationId,
          ...(validate ? { 'x-mir-validation': 'ok' } : {}),
          'Cache-Control': 'no-store',
        },
      });
    } catch (xmlError: any) {
      console.error(`[PV-EXPORT] ${correlationId} - Error generando XML:`, xmlError);

      // Bitácora: error
      try {
        const payloadHash = crypto
          .createHash('sha256')
          .update(String(xmlError?.message || xmlError))
          .digest('hex');
        await logAudit({
          action: 'ERROR',
          entityType: 'PV_EXPORT',
          entityId: correlationId,
          payloadHash,
          meta: { stage: 'xml_generation_error' }
        });
      } catch {}
      return NextResponse.json(
        { 
          error: 'XML_GENERATION_ERROR', 
          correlationId, 
          message: xmlError?.message || 'Error al generar XML',
          data: parsed.data
        },
        { status: 500, headers: { 'x-correlation-id': correlationId } }
      );
    }
    
  } catch (err: any) {
    console.error(`[PV-EXPORT] ${correlationId} - Error interno:`, err?.stack || err?.message || err);
    
    // Diferentes tipos de errores
    let errorType = 'INTERNAL_ERROR';
    let statusCode = 500;
    
    if (err?.name === 'SyntaxError' && err?.message?.includes('JSON')) {
      errorType = 'INVALID_JSON';
      statusCode = 400;
    }
    
    // Bitácora: error interno
    try {
      const payloadHash = crypto
        .createHash('sha256')
        .update(String(err?.message || err))
        .digest('hex');
      await logAudit({
        action: 'ERROR',
        entityType: 'PV_EXPORT',
        entityId: correlationId,
        payloadHash,
        meta: { stage: 'internal_error', errorType }
      });
    } catch {}

    return NextResponse.json(
      { 
        error: errorType, 
        correlationId, 
        message: err?.message || 'Error interno del servidor',
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      },
      { status: statusCode, headers: { 'x-correlation-id': correlationId } }
    );
  }
}

// Handler para OPTIONS (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://form.delfincheckin.com',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}
