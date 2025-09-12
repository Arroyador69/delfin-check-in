import { NextRequest } from 'next/server';
import { create } from 'xmlbuilder2';
import { z } from 'zod';

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
  rol: z.string().default('VI'), // Siempre VI para Partes de viajeros
  nombre: z.string().min(1),
  apellido1: z.string().min(1),
  apellido2: z.string().optional(),
  tipoDocumento: z.string().optional(),
  numeroDocumento: z.string().optional(), // Etiqueta correcta v1.1.1
  soporteDocumento: z.string().optional(),
  fechaNacimiento: z.string().min(1),
  nacionalidad: z.string().optional(), // Más flexible
  sexo: z.string().optional(), // Más flexible
  telefono: z.string().optional(),
  telefono2: z.string().optional(),
  correo: z.string().optional(), // Más flexible
  direccion: DireccionSchema
});

const PagoSchema = z.object({
  tipoPago: z.string().default('EFECT'),
  fechaPago: z.string().optional(),
  medioPago: z.string().optional(),
  titular: z.string().optional(),
  caducidadTarjeta: z.string().optional()
});

const ContratoSchema = z.object({
  referencia: z.string().default('0000146967'),
  fechaContrato: z.string().default(() => new Date().toISOString().split('T')[0]),
  fechaEntrada: z.string().default(() => new Date().toISOString().split('T')[0]),
  fechaSalida: z.string().default(() => new Date().toISOString().split('T')[0]),
  numPersonas: z.number().int().positive().default(1),
  numHabitaciones: z.number().int().positive().optional().default(1),
  internet: z.boolean().optional().default(false),
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

// Función de validación exhaustiva según MIR v1.1.1
function validateParte(parte: any): string[] {
  const errs: string[] = [];
  
  // Validar numPersonas vs personas.length
  if (parte.contrato.numPersonas !== parte.personas.length) {
    errs.push(`numPersonas=${parte.contrato.numPersonas} pero personas=${parte.personas.length}`);
  }

  // Validar cada persona
  parte.personas.forEach((p: any, i: number) => {
    if (p.rol !== 'VI') {
      errs.push(`persona[${i}].rol debe ser 'VI'`);
    }
    
    // Al menos un contacto obligatorio
    if (!(p.telefono || p.telefono2 || p.correo)) {
      errs.push(`persona[${i}] sin contacto (telefono, telefono2 o correo)`);
    }
    
    // Dirección obligatoria
    if (!p.direccion) {
      errs.push(`persona[${i}] sin direccion`);
    } else {
      if (!p.direccion.pais) {
        errs.push(`persona[${i}].direccion.pais requerido (ISO-3)`);
      }
      if (p.direccion.pais === 'ESP' && !/^\d{5}$/.test(p.direccion.codigoMunicipio || '')) {
        errs.push(`persona[${i}].codigoMunicipio debe ser INE de 5 dígitos para España`);
      }
      if (p.direccion.pais !== 'ESP' && !p.direccion.nombreMunicipio) {
        errs.push(`persona[${i}].nombreMunicipio requerido para países no españoles`);
      }
    }
    
    // Validar mayor de edad
    const fechaNac = new Date(p.fechaNacimiento);
    const hoy = new Date();
    const edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mayorDeEdad = edad >= 18;
    
    if (mayorDeEdad) {
      if (!p.tipoDocumento) {
        errs.push(`persona[${i}].tipoDocumento requerido para mayores de edad`);
      }
      if (!p.numeroDocumento) {
        errs.push(`persona[${i}].numeroDocumento requerido para mayores de edad`);
      }
      if (p.tipoDocumento === 'NIF' && !p.apellido2) {
        errs.push(`persona[${i}].apellido2 requerido para NIF`);
      }
    }
  });

  // Validar pago obligatorio en cada comunicación
  parte.comunicaciones.forEach((com: any, i: number) => {
    if (!com.contrato.pago || !com.contrato.pago.tipoPago) {
      errs.push(`comunicacion[${i}].pago.tipoPago requerido`);
    }
  });

  return errs;
}

function personaToXML(p: z.infer<typeof PersonaSchema>) {
  const persona: any = {
    rol: 'VI', // Siempre VI para Partes de viajeros
    nombre: p.nombre,
    apellido1: p.apellido1
  };

  // Campos opcionales
  if (p.apellido2) persona.apellido2 = p.apellido2;
  if (p.tipoDocumento) persona.tipoDocumento = p.tipoDocumento;
  if (p.numeroDocumento) persona.numeroDocumento = p.numeroDocumento; // Etiqueta correcta v1.1.1
  if (p.soporteDocumento) persona.soporteDocumento = p.soporteDocumento;
  if (p.nacionalidad) persona.nacionalidad = p.nacionalidad;
  if (p.sexo) persona.sexo = p.sexo;

  // Fecha de nacimiento
  persona.fechaNacimiento = p.fechaNacimiento;

  // Dirección obligatoria
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

  // Contacto - al menos uno obligatorio
  if (p.telefono) persona.telefono = p.telefono;
  if (p.telefono2) persona.telefono2 = p.telefono2;
  if (p.correo) persona.correo = p.correo;

  return { persona };
}

// Funciones de formateo de fechas según MIR v1.1.1
const toDate = (d: string) => d.split('T')[0]; // AAAA-MM-DD
const toDateTime = (d: string) => {
  if (!d) return '';
  // Si ya tiene formato AAAA-MM-DD, añadir T00:00:00
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d + 'T00:00:00';
  }
  // Si ya tiene formato AAAA-MM-DDThh:mm:ss, devolverlo
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(d)) {
    return d;
  }
  return d;
};

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Generando XML para partes de viajeros...');
    
    const json = await req.json().catch(() => undefined);
    console.log('📋 Datos recibidos:', JSON.stringify(json, null, 2));
    
    const parsed = PayloadSchema.safeParse(json);
    if (!parsed.success) {
      console.error('❌ Error de validación:', parsed.error.flatten());
      console.error('❌ Datos que fallaron la validación:', JSON.stringify(json, null, 2));
      return new Response(JSON.stringify({ 
        error: 'Error de validación de datos',
        details: parsed.error.flatten(),
        receivedData: json
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    console.log('✅ Datos validados correctamente');

    const { codigoEstablecimiento, comunicaciones } = parsed.data;

    // Validar cada comunicación según MIR v1.1.1
    for (const comunicacion of comunicaciones) {
      const validationErrors = validateParte(comunicacion);
      if (validationErrors.length > 0) {
        console.error('❌ Errores de validación MIR:', validationErrors);
        return new Response(JSON.stringify({ 
          error: 'Error de validación MIR v1.1.1',
          details: validationErrors 
        }), { 
          status: 422, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }

    const root = {
      peticion: {
        solicitud: {
          codigoEstablecimiento,
          comunicacion: comunicaciones.map((c) => {
            const personasXml = c.personas.map(personaToXML).map((n) => n.persona);
            
            return {
              contrato: {
                referencia: c.contrato.referencia,
                fechaContrato: toDate(c.contrato.fechaContrato),
                fechaEntrada: toDateTime(c.contrato.fechaEntrada),
                fechaSalida: toDateTime(c.contrato.fechaSalida),
                numPersonas: String(c.contrato.numPersonas),
                ...(c.contrato.numHabitaciones ? { numHabitaciones: String(c.contrato.numHabitaciones) } : {}),
                ...(typeof c.contrato.internet === 'boolean' ? { internet: c.contrato.internet ? 'true' : 'false' } : {}),
                pago: {
                  tipoPago: c.contrato.pago.tipoPago,
                  ...(c.contrato.pago.fechaPago ? { fechaPago: toDate(c.contrato.pago.fechaPago) } : {}),
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



