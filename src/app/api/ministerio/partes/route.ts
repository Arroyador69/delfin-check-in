import { NextRequest } from 'next/server';
import { create } from 'xmlbuilder2';
import { z } from 'zod';

// Esquemas Zod basados en los requisitos aportados
const DireccionSchema = z.object({
  direccion: z.string().min(1),
  direccionComplementaria: z.string().optional(),
  codigoPostal: z.string().min(1),
  pais: z.string().min(1),
  codigoMunicipio: z.string().optional(),
  nombreMunicipio: z.string().optional()
});

const PersonaSchema = z.object({
  rol: z.string().optional().default('VI'),
  nombre: z.string().min(1),
  apellido1: z.string().min(1),
  apellido2: z.string().optional(),
  tipoDocumento: z.string().optional(),
  numeroDocumento: z.string().optional(),
  soporteDocumento: z.string().optional(),
  fechaNacimiento: z.string().min(1),
  nacionalidad: z.string().optional(),
  sexo: z.string().optional(),
  contacto: z.object({
    telefono: z.string().optional(),
    telefono2: z.string().optional(),
    correo: z.string().optional()
  }).optional(),
  direccion: DireccionSchema
});

const PagoSchema = z.object({
  tipoPago: z.string().min(1),
  fechaPago: z.string().optional(),
  medioPago: z.string().optional(),
  titular: z.string().optional(),
  caducidadTarjeta: z.string().optional()
});

const ContratoSchema = z.object({
  referencia: z.string().min(1),
  fechaContrato: z.string().min(1),
  fechaEntrada: z.string().min(1),
  fechaSalida: z.string().min(1),
  numPersonas: z.number().int().positive(),
  numHabitaciones: z.number().int().positive().optional(),
  internet: z.boolean().optional(),
  pago: PagoSchema
});

const ComunicacionSchema = z.object({
  contrato: ContratoSchema,
  personas: z.array(PersonaSchema).min(1)
});

const PayloadSchema = z.object({
  codigoEstablecimiento: z.string().min(1).max(10),
  comunicaciones: z.array(ComunicacionSchema).min(1)
});

function personaToXML(p: z.infer<typeof PersonaSchema>) {
  const persona: any = {
    rol: p.rol || 'VI',
    nombre: p.nombre,
    apellido1: p.apellido1
  };

  // Campos opcionales
  if (p.apellido2) persona.apellido2 = p.apellido2;
  if (p.tipoDocumento) persona.tipoDocumento = p.tipoDocumento;
  if (p.numeroDocumento) persona.numeroDocumento = p.numeroDocumento;
  if (p.soporteDocumento) persona.soporteDocumento = p.soporteDocumento;
  if (p.nacionalidad) persona.nacionalidad = p.nacionalidad;
  if (p.sexo) persona.sexo = p.sexo;

  // Fecha de nacimiento
  persona.fechaNacimiento = p.fechaNacimiento;

  // Dirección
  persona.direccion = {
    direccion: p.direccion.direccion,
    codigoPostal: p.direccion.codigoPostal,
    pais: p.direccion.pais
  };

  if (p.direccion.direccionComplementaria) {
    persona.direccion.direccionComplementaria = p.direccion.direccionComplementaria;
  }

  if (p.direccion.pais === 'ESP' && p.direccion.codigoMunicipio) {
    persona.direccion.codigoMunicipio = p.direccion.codigoMunicipio;
  } else if (p.direccion.pais !== 'ESP' && p.direccion.nombreMunicipio) {
    persona.direccion.nombreMunicipio = p.direccion.nombreMunicipio;
  }

  // Contacto
  if (p.contacto) {
    if (p.contacto.telefono) persona.telefono = p.contacto.telefono;
    if (p.contacto.telefono2) persona.telefono2 = p.contacto.telefono2;
    if (p.contacto.correo) persona.correo = p.contacto.correo;
  }

  return { persona };
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Generando XML para partes de viajeros...');
    
    const json = await req.json().catch(() => undefined);
    console.log('📋 Datos recibidos:', JSON.stringify(json, null, 2));
    
    const parsed = PayloadSchema.safeParse(json);
    if (!parsed.success) {
      console.error('❌ Error de validación:', parsed.error.flatten());
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    console.log('✅ Datos validados correctamente');

  const { codigoEstablecimiento, comunicaciones } = parsed.data;

  const root = {
    peticion: {
      solicitud: {
        codigoEstablecimiento,
        comunicacion: comunicaciones.map((c) => {
          const personasXml = c.personas.map(personaToXML).map((n) => n.persona);
          
          // Formatear fechas para el XML
          const formatDateForXML = (dateStr: string) => {
            if (!dateStr) return '';
            // Si ya tiene formato AAAA-MM-DD, añadir T00:00:00
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return dateStr + 'T00:00:00';
            }
            return dateStr;
          };

          return {
            contrato: {
              referencia: c.contrato.referencia,
              fechaContrato: c.contrato.fechaContrato,
              fechaEntrada: formatDateForXML(c.contrato.fechaEntrada),
              fechaSalida: formatDateForXML(c.contrato.fechaSalida),
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

    console.log('📝 Generando estructura XML...');
    
    const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele(root);
    const xml = doc.end({ prettyPrint: true });
    
    console.log('📄 XML generado:', xml.substring(0, 500) + '...');
    console.log('✅ XML generado exitosamente');

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename=partes_viajeros_${new Date().toISOString().slice(0,10)}.xml`
      }
    });
  } catch (error) {
    console.error('💥 Error generando XML:', error);
    return new Response(JSON.stringify({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}


