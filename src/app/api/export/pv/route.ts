import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

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
        if (p.direccion.pais === 'ESP' && !/^\d{5}$/.test(p.direccion.codigoMunicipio || '')) {
          details.push(`comunicaciones[${idx}].personas[${i}].codigoMunicipio debe ser INE de 5 dígitos para España`);
        }
        if (p.direccion.pais !== 'ESP' && !p.direccion.nombreMunicipio) {
          details.push(`comunicaciones[${idx}].personas[${i}].nombreMunicipio requerido para países no españoles`);
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

// Función para construir XML manualmente (sin dependencias externas)
function buildXML(data: z.infer<typeof PayloadSchema>): string {
  const esc = (s: any) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<peticion>\n';
  xml += '  <solicitud>\n';
  xml += `    <codigoEstablecimiento>${esc(data.codigoEstablecimiento)}</codigoEstablecimiento>\n`;

  data.comunicaciones.forEach((comunicacion) => {
    xml += '    <comunicacion>\n';
    
    // Contrato
    xml += '      <contrato>\n';
    xml += `        <referencia>${esc(comunicacion.contrato.referencia)}</referencia>\n`;
    xml += `        <fechaContrato>${esc(comunicacion.contrato.fechaContrato)}</fechaContrato>\n`;
    xml += `        <fechaEntrada>${esc(comunicacion.contrato.fechaEntrada)}</fechaEntrada>\n`;
    xml += `        <fechaSalida>${esc(comunicacion.contrato.fechaSalida)}</fechaSalida>\n`;
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
      xml += `          <fechaPago>${esc(comunicacion.contrato.pago.fechaPago)}</fechaPago>\n`;
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
        xml += `        <tipoDocumento>${esc(persona.tipoDocumento)}</tipoDocumento>\n`;
      }
      if (persona.numeroDocumento) {
        xml += `        <numeroDocumento>${esc(persona.numeroDocumento)}</numeroDocumento>\n`;
      }
      if (persona.soporteDocumento) {
        xml += `        <soporteDocumento>${esc(persona.soporteDocumento)}</soporteDocumento>\n`;
      }
      xml += `        <fechaNacimiento>${esc(persona.fechaNacimiento)}</fechaNacimiento>\n`;
      if (persona.nacionalidad) {
        xml += `        <nacionalidad>${esc(persona.nacionalidad)}</nacionalidad>\n`;
      }
      if (persona.sexo) {
        xml += `        <sexo>${esc(persona.sexo)}</sexo>\n`;
      }
      if (persona.telefono) {
        xml += `        <telefono>${esc(persona.telefono)}</telefono>\n`;
      }
      if (persona.telefono2) {
        xml += `        <telefono2>${esc(persona.telefono2)}</telefono2>\n`;
      }
      if (persona.correo) {
        xml += `        <correo>${esc(persona.correo)}</correo>\n`;
      }
      
      // Dirección
      xml += '        <direccion>\n';
      if (persona.direccion.direccion) {
        xml += `          <direccion>${esc(persona.direccion.direccion)}</direccion>\n`;
      }
      if (persona.direccion.direccionComplementaria) {
        xml += `          <direccionComplementaria>${esc(persona.direccion.direccionComplementaria)}</direccionComplementaria>\n`;
      }
      if (persona.direccion.codigoPostal) {
        xml += `          <codigoPostal>${esc(persona.direccion.codigoPostal)}</codigoPostal>\n`;
      }
      xml += `          <pais>${esc(persona.direccion.pais)}</pais>\n`;
      if (persona.direccion.pais === 'ESP' && persona.direccion.codigoMunicipio) {
        xml += `          <codigoMunicipio>${esc(persona.direccion.codigoMunicipio)}</codigoMunicipio>\n`;
      } else if (persona.direccion.pais !== 'ESP' && persona.direccion.nombreMunicipio) {
        xml += `          <nombreMunicipio>${esc(persona.direccion.nombreMunicipio)}</nombreMunicipio>\n`;
      }
      xml += '        </direccion>\n';
      xml += '      </persona>\n';
    });
    
    xml += '    </comunicacion>\n';
  });

  xml += '  </solicitud>\n';
  xml += '</peticion>\n';
  
  return xml;
}

export async function POST(req: NextRequest) {
  const correlationId = crypto.randomBytes(8).toString('hex');
  
  try {
    console.log(`[PV-EXPORT] ${correlationId} - Iniciando generación XML`);
    
    const json = await req.json();
    console.log(`[PV-EXPORT] ${correlationId} - Datos recibidos:`, JSON.stringify(json, null, 2));

    // Validación de esquema
    const parsed = PayloadSchema.safeParse(json);
    if (!parsed.success) {
      const details = parsed.error.errors.map(e => `${e.path.join('.')} — ${e.message}`);
      console.error(`[PV-EXPORT] ${correlationId} - Error de validación:`, details);
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details, correlationId },
        { status: 422, headers: { 'x-correlation-id': correlationId } }
      );
    }

    // Reglas de negocio MIR
    const businessErrors = validateBusinessRules(parsed.data);
    if (businessErrors.length > 0) {
      console.error(`[PV-EXPORT] ${correlationId} - Errores de negocio:`, businessErrors);
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: businessErrors, correlationId },
        { status: 422, headers: { 'x-correlation-id': correlationId } }
      );
    }

    // Construir XML
    console.log(`[PV-EXPORT] ${correlationId} - Generando XML`);
    const xml = buildXML(parsed.data);
    console.log(`[PV-EXPORT] ${correlationId} - XML generado exitosamente`);

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="partes_viajeros_${Date.now()}.xml"`,
        'x-correlation-id': correlationId,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error(`[PV-EXPORT] ${correlationId} - Error interno:`, err?.stack || err?.message || err);
    return NextResponse.json(
      { error: 'INTERNAL', correlationId, message: err?.message || 'Error interno del servidor' },
      { status: 500, headers: { 'x-correlation-id': correlationId } }
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
