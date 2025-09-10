import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { insertGuestRegistration } from '@/lib/db';

// Configuración CORS robusta - Fix definitivo
const ALLOWED_ORIGINS = [
  'https://form.delfincheckin.com',
  'https://www.form.delfincheckin.com',
  'https://arroyador69.github.io',
  'http://localhost:3000', // Para desarrollo
  'http://localhost:3001', // Para desarrollo alternativo
  'http://127.0.0.1:3000', // Para desarrollo local
  'http://127.0.0.1:3001'  // Para desarrollo local alternativo
];

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  
  return {
    'Access-Control-Allow-Origin': allowed ? origin : '*',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400'
  };
}

// Manejar preflight OPTIONS - Fix definitivo
export async function OPTIONS(req: NextRequest) {
  const headers = corsHeaders(req);
  return new NextResponse(null, { 
    status: 200, 
    headers 
  });
}

// Schema de validación simplificado para el formulario público
const PublicGuestRegistrationSchema = z.object({
  codigoEstablecimiento: z.string().min(1),
  comunicaciones: z.array(z.object({
    contrato: z.object({
      referencia: z.string().min(1),
      fechaContrato: z.string().optional(),
      fechaEntrada: z.string().min(1),
      fechaSalida: z.string().min(1),
      numPersonas: z.number().int().positive().optional().default(1),
      numHabitaciones: z.number().int().positive().optional().default(1),
      internet: z.boolean().default(false),
      pago: z.object({
        tipoPago: z.string().min(1),
        fechaPago: z.string().optional(),
        medioPago: z.string().optional(),
        titular: z.string().optional(),
        caducidadTarjeta: z.string().optional(),
      }).partial().extend({
        tipoPago: z.string().min(1),
      })
    }),
    personas: z.array(z.object({
      rol: z.string().default('VI'),
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
        correo: z.string().optional(),
      }).optional(),
      direccion: z.object({
        direccion: z.string().min(1),
        direccionComplementaria: z.string().optional(),
        codigoPostal: z.string().min(1),
        pais: z.string().min(1),
        codigoMunicipio: z.string().optional(),
        nombreMunicipio: z.string().optional(),
      }),
    })).min(1),
  })).min(1),
});

// Función para convertir fecha a formato ISO
function convertToISODate(dateString: string): string {
  // Si ya está en formato ISO, devolverlo
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Si está en formato DD/MM/AAAA, convertir a AAAA-MM-DD
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si está en formato AAAA-MM-DDThh:mm:ss, extraer solo la fecha
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateString)) {
    return dateString.split('T')[0];
  }
  
  // Si no se puede convertir, devolver la fecha actual
  console.warn(`No se pudo convertir la fecha: ${dateString}`);
  return new Date().toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  try {
    const headers = corsHeaders(req);
    const origin = req.headers.get('origin') || '';
    
    console.log('📨 Endpoint público recibiendo registro de viajero...');
    console.log('🌐 Origen de la petición:', origin);
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      console.error('❌ Datos JSON inválidos o vacíos');
      return NextResponse.json({ 
        error: 'Datos JSON inválidos o vacíos' 
      }, { 
        status: 400,
        headers
      });
    }

    console.log('📋 Datos recibidos del formulario público:', JSON.stringify(json, null, 2));

    const parsed = PublicGuestRegistrationSchema.safeParse(json);
    
    if (!parsed.success) {
      console.error('❌ Error de validación:', parsed.error.flatten());
      return NextResponse.json({ 
        error: 'Datos del formulario inválidos',
        details: parsed.error.flatten() 
      }, { 
        status: 422,
        headers
      });
    }

    // Extraer la primera comunicación
    const comunicacion = parsed.data.comunicaciones[0];
    
    // Convertir fechas a formato ISO
    const fecha_entrada = convertToISODate(comunicacion.contrato.fechaEntrada);
    const fecha_salida = convertToISODate(comunicacion.contrato.fechaSalida);
    
    // Valores automáticos del establecimiento (no visibles para el cliente)
    const ESTABLISHMENT_CODE = "0000256653"; // HABITACIONES EN CASA VACACIONAL FUENGIROLA
    const ESTABLISHMENT_REFERENCE = "0000146967"; // DOLORES MARIA ARROYO ZAMBRANO
    
    // Asegurar que los valores automáticos estén incluidos
    const dataWithDefaults = {
      ...parsed.data,
      codigoEstablecimiento: ESTABLISHMENT_CODE,
      comunicaciones: parsed.data.comunicaciones.map(com => ({
        ...com,
        contrato: {
          ...com.contrato,
          referencia: ESTABLISHMENT_REFERENCE
        }
      }))
    };
    
    // Generar referencia única
    const reserva_ref = ESTABLISHMENT_REFERENCE;

    console.log('💾 Guardando en base de datos Postgres...');
    console.log('📅 Fecha entrada:', fecha_entrada);
    console.log('📅 Fecha salida:', fecha_salida);
    console.log('🔖 Referencia:', reserva_ref);

    // Guardar en base de datos Postgres
    const id = await insertGuestRegistration({
      reserva_ref,
      fecha_entrada,
      fecha_salida,
      data: dataWithDefaults
    });

    console.log('✅ Registro guardado en DB con ID:', id);

    return NextResponse.json({ 
      success: true, 
      message: 'Registro guardado correctamente en base de datos',
      id: id,
      reserva_ref: reserva_ref,
      date: new Date().toISOString().split('T')[0]
    }, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('💥 Error interno del servidor en endpoint público:', error);
    
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 422,
      headers: corsHeaders(req)
    });
  }
}