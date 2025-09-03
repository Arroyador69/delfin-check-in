import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveComunicacion } from '@/lib/spain-ministry';

// Schema de validación para el formulario público
const PublicGuestRegistrationSchema = z.object({
  codigoEstablecimiento: z.string().min(1).max(10),
  comunicaciones: z.array(z.object({
    contrato: z.object({
      referencia: z.string().min(1),
      fechaContrato: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      fechaEntrada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      fechaSalida: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      numPersonas: z.number().int().positive(),
      numHabitaciones: z.number().int().positive().optional(),
      internet: z.boolean().optional(),
      pago: z.object({
        tipoPago: z.string().min(1),
        fechaPago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        medioPago: z.string().optional(),
        titular: z.string().optional(),
        caducidadTarjeta: z.string().optional(),
      })
    }),
    personas: z.array(z.object({
      rol: z.string().optional(),
      nombre: z.string().min(1),
      apellido1: z.string().min(1),
      apellido2: z.string().optional(),
      tipoDocumento: z.string().optional(),
      numeroDocumento: z.string().optional(),
      soporteDocumento: z.string().optional(),
      fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      nacionalidad: z.string().optional(),
      sexo: z.string().optional(),
      contacto: z.object({
        telefono: z.string().optional(),
        telefono2: z.string().optional(),
        correo: z.string().email().optional(),
      }).optional(),
      direccion: z.object({
        direccion: z.string().min(1),
        direccionComplementaria: z.string().optional(),
        codigoPostal: z.string().min(1),
        pais: z.string().min(1),
        codigoMunicipio: z.string().min(1),
        nombreMunicipio: z.string().optional(),
      }),
    })).min(1),
  })).min(1),
});

export async function POST(req: NextRequest) {
  try {
    console.log('📨 Endpoint público recibiendo registro de viajero...');
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      console.error('❌ Datos JSON inválidos o vacíos');
      return NextResponse.json({ 
        error: 'Datos JSON inválidos o vacíos' 
      }, { status: 400 });
    }

    console.log('📋 Datos recibidos del formulario público:', JSON.stringify(json, null, 2));

    const parsed = PublicGuestRegistrationSchema.safeParse(json);
    
    if (!parsed.success) {
      console.error('❌ Error de validación:', parsed.error.flatten());
      return NextResponse.json({ 
        error: 'Datos del formulario inválidos',
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    // Extraer la primera comunicación (el formulario solo envía una)
    const comunicacion = parsed.data.comunicaciones[0];
    
    // Crear el formato que espera saveComunicacion
    const dataToSave = {
      codigoEstablecimiento: parsed.data.codigoEstablecimiento,
      contrato: comunicacion.contrato,
      personas: comunicacion.personas,
    };

    console.log('💾 Guardando datos del formulario público:', JSON.stringify(dataToSave, null, 2));

    const today = new Date().toISOString().slice(0, 10);
    await saveComunicacion(today, dataToSave);

    console.log('✅ Registro público guardado exitosamente para la fecha:', today);

    return NextResponse.json({ 
      success: true, 
      message: 'Registro guardado correctamente',
      date: today 
    });

  } catch (error) {
    console.error('💥 Error interno del servidor en endpoint público:', error);
    
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
