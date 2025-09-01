import { NextRequest } from 'next/server';
import { create } from 'xmlbuilder2';
import { z } from 'zod';

// Esquemas Zod basados en los requisitos aportados
const DireccionSchema = z.object({
  direccion: z.string().min(1),
  direccionComplementaria: z.string().optional(),
  codigoPostal: z.string().min(1),
  pais: z.string().length(3),
  codigoMunicipio: z.string().length(5).optional(),
  nombreMunicipio: z.string().optional()
}).superRefine((d, ctx) => {
  if (d.pais === 'ESP' && !d.codigoMunicipio) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'codigoMunicipio es obligatorio en España' });
  }
  if (d.pais !== 'ESP' && !d.nombreMunicipio) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'nombreMunicipio es obligatorio si el país no es España' });
  }
});

const PersonaSchema = z.object({
  rol: z.literal('VI'),
  nombre: z.string().min(1),
  apellido1: z.string().min(1),
  apellido2: z.string().optional(),
  tipoDocumento: z.enum(['NIF','NIE','PAS','OTRO']).optional(),
  numeroDocumento: z.string().optional(),
  soporteDocumento: z.string().optional(),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nacionalidad: z.string().length(3).optional(),
  sexo: z.enum(['H','M','O']).optional(),
  contacto: z.object({
    telefono: z.string().optional(),
    telefono2: z.string().optional(),
    correo: z.string().email().optional()
  }),
  parentesco: z.enum(['AB','BA','BN','CD','CY','HJ','HR','NI','PM','SB','SG','TI','YN','TU','OT']).optional(),
  direccion: DireccionSchema
}).superRefine((p, ctx) => {
  if (!p.contacto.telefono && !p.contacto.telefono2 && !p.contacto.correo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe incluir teléfono o correo' });
  }
  const age = Math.floor((Date.now() - new Date(p.fechaNacimiento + 'T00:00:00Z').getTime()) / (365.25*24*3600*1000));
  if (age >= 18) {
    if (!p.tipoDocumento || !p.numeroDocumento) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documento obligatorio para mayores de edad' });
    }
    if ((p.tipoDocumento === 'NIF' || p.tipoDocumento === 'NIE') && !p.soporteDocumento) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'soporteDocumento es obligatorio para NIF/NIE' });
    }
    if (p.tipoDocumento === 'NIF' && !p.apellido2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'apellido2 es obligatorio si tipoDocumento es NIF' });
    }
  }
});

const PagoSchema = z.object({
  tipoPago: z.enum(['EFECT','TARJT','PLATF','TRANS','MOVIL','TREG','DESTI','OTRO']),
  fechaPago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  medioPago: z.string().optional(),
  titular: z.string().optional(),
  caducidadTarjeta: z.string().regex(/^\d{2}\/\d{4}$/).optional()
});

const ContratoSchema = z.object({
  referencia: z.string().min(1),
  fechaContrato: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaEntrada: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
  fechaSalida: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
  numPersonas: z.number().int().positive(),
  numHabitaciones: z.number().int().positive().optional(),
  internet: z.boolean().optional(),
  pago: PagoSchema
});

const ComunicacionSchema = z.object({
  contrato: ContratoSchema,
  personas: z.array(PersonaSchema).min(1)
}).superRefine((c, ctx) => {
  if (c.personas.length !== c.contrato.numPersonas) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'numPersonas debe coincidir con número de personas' });
  }
});

const PayloadSchema = z.object({
  codigoEstablecimiento: z.string().min(1).max(10),
  comunicaciones: z.array(ComunicacionSchema).min(1)
});

function personaToXML(p: z.infer<typeof PersonaSchema>) {
  return {
    persona: {
      rol: p.rol,
      nombre: p.nombre,
      apellido1: p.apellido1,
      ...(p.apellido2 ? { apellido2: p.apellido2 } : {}),
      ...(p.tipoDocumento ? { tipoDocumento: p.tipoDocumento } : {}),
      ...(p.numeroDocumento ? { numeroDocumento: p.numeroDocumento } : {}),
      ...(p.soporteDocumento ? { soporteDocumento: p.soporteDocumento } : {}),
      fechaNacimiento: p.fechaNacimiento,
      ...(p.nacionalidad ? { nacionalidad: p.nacionalidad } : {}),
      ...(p.sexo ? { sexo: p.sexo } : {}),
      direccion: {
        direccion: p.direccion.direccion,
        ...(p.direccion.direccionComplementaria ? { direccionComplementaria: p.direccion.direccionComplementaria } : {}),
        ...(p.direccion.pais === 'ESP'
            ? { codigoMunicipio: p.direccion.codigoMunicipio }
            : { nombreMunicipio: p.direccion.nombreMunicipio }),
        codigoPostal: p.direccion.codigoPostal,
        pais: p.direccion.pais
      },
      ...(p.contacto.telefono ? { telefono: p.contacto.telefono } : {}),
      ...(p.contacto.telefono2 ? { telefono2: p.contacto.telefono2 } : {}),
      ...(p.contacto.correo ? { correo: p.contacto.correo } : {}),
      ...(p.parentesco ? { parentesco: p.parentesco } : {})
    }
  } as const;
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => undefined);
  const parsed = PayloadSchema.safeParse(json);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { codigoEstablecimiento, comunicaciones } = parsed.data;

  const root = {
    peticion: {
      solicitud: {
        codigoEstablecimiento,
        comunicacion: comunicaciones.map((c) => {
          const personasXml = c.personas.map(personaToXML).map((n) => n.persona);
          return {
          contrato: {
            referencia: c.contrato.referencia,
            fechaContrato: c.contrato.fechaContrato,
            fechaEntrada: c.contrato.fechaEntrada,
            fechaSalida: c.contrato.fechaSalida,
            numPersonas: String(c.contrato.numPersonas),
            ...(c.contrato.numHabitaciones ? { numHabitaciones: String(c.contrato.numHabitaciones) } : {}),
            ...(typeof c.contrato.internet === 'boolean' ? { internet: c.contrato.internet ? 'true' : 'false' } : {}),
            pago: {
              tipoPago: c.contrato.pago.tipoPago,
              ...(c.contrato.pago.fechaPago ? { fechaPago: c.contrato.pago.fechaPago } : {}),
              ...(c.contrato.pago.medioPago ? { medioPago: c.contrato.pago.medioPago } : {}),
              ...(c.contrato.pago.titular ? { titular: c.contrato.pago.titular } : {}),
              ...(c.contrato.pago.caducidadTarjeta ? { caducidadTarjeta: c.contrato.pago.caducidadTarjeta } : {})
            }
          },
          persona: personasXml.length === 1 ? personasXml[0] : personasXml
        };
        })
      }
    }
  };

  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele(root);
  const xml = doc.end({ prettyPrint: true });

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename=partes_viajeros_${new Date().toISOString().slice(0,10)}.xml`
    }
  });
}


