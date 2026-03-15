import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { insertGuestRegistration, sql } from '@/lib/db';
import { logError } from '@/lib/error-logger';
import { getTenantById, hasLegalModuleAccess } from '@/lib/tenant';

// Configuración CORS robusta - Fix definitivo
const ALLOWED_ORIGINS = new Set([
  'https://form.delfincheckin.com',
  'https://www.form.delfincheckin.com',
  'https://admin.delfincheckin.com',
  'https://arroyador69.github.io',
  'http://localhost:3000', // Para desarrollo
  'http://localhost:3001', // Para desarrollo alternativo
  'http://127.0.0.1:3000', // Para desarrollo local
  'http://127.0.0.1:3001'  // Para desarrollo local alternativo
]);

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.has(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  const allow = allowed ? origin : 'https://form.delfincheckin.com';
  
  return {
    'Access-Control-Allow-Origin': allow,
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
      const flattened = parsed.error.flatten();
      const formErrors = flattened.formErrors || [];
      const fieldErrorsObj = flattened.fieldErrors as Record<string, string[]>;
      const fieldErrorsList: { field: string; message: string }[] = [];
      for (const [path, messages] of Object.entries(fieldErrorsObj)) {
        if (Array.isArray(messages) && messages[0]) {
          fieldErrorsList.push({ field: path, message: messages[0] });
        }
      }
      const firstForm = formErrors[0];
      const firstField = fieldErrorsList[0];
      const message = firstForm || (firstField ? `${firstField.field}: ${firstField.message}` : 'Revisa los datos del formulario.');
      console.error('❌ Error de validación:', flattened);
      return NextResponse.json({ 
        error: 'Datos del formulario inválidos',
        message: typeof message === 'string' ? message : 'Revisa los datos del formulario.',
        fieldErrors: fieldErrorsList,
        details: flattened
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
    
    // Generar referencia única para cada reserva (máximo 36 caracteres según normas MIR)
    const reserva_ref = crypto.randomUUID(); // Solo UUID, sin prefijo REF- ni timestamp
    
    // Asegurar que los valores automáticos estén incluidos
    const dataWithDefaults = {
      ...parsed.data,
      codigoEstablecimiento: ESTABLISHMENT_CODE,
      comunicaciones: parsed.data.comunicaciones.map(com => ({
        ...com,
        contrato: {
          ...com.contrato,
          referencia: reserva_ref  // Usar la referencia única generada
        }
      }))
    };

    console.log('💾 Guardando en base de datos Postgres...');
    console.log('📅 Fecha entrada:', fecha_entrada);
    console.log('📅 Fecha salida:', fecha_salida);
    console.log('🔖 Referencia:', reserva_ref);

    // Obtener tenant_id de los parámetros de la URL o del body
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
    const tenantId = urlParams.get('tenant_id') || json.tenant_id || 'default';
    
    console.log('🏢 Tenant ID detectado:', tenantId);

    // Verificar si el tenant puede realizar operaciones (no está suspendido)
    if (tenantId && tenantId !== 'default') {
      const { requireActiveTenant } = await import('@/lib/payment-middleware');
      const paymentCheck = await requireActiveTenant(req, tenantId);
      if (paymentCheck) {
        return NextResponse.json(
          { 
            error: paymentCheck.error,
            code: paymentCheck.code,
            reason: paymentCheck.reason,
            canViewData: true
          },
          { status: paymentCheck.status, headers }
        );
      }
      
      // Plan básico (gratuito) puede usar formulario + guardar datos; el envío automático MIR solo si legal_module
    }

    const firmas = json.firmas && Array.isArray(json.firmas) ? json.firmas : (json.firma ? [json.firma] : null);
    const firmaFechas = json.firma_fechas && Array.isArray(json.firma_fechas) ? json.firma_fechas : (json.firma_fecha ? [json.firma_fecha] : null);
    const signature_data = firmas && firmas.length ? JSON.stringify(firmas) : null;
    const signature_date = firmaFechas && firmaFechas[0] ? firmaFechas[0] : json.firma_fecha || null;

    const id = await insertGuestRegistration({
      reserva_ref,
      fecha_entrada,
      fecha_salida,
      data: dataWithDefaults,
      tenant_id: tenantId,
      signature_data,
      signature_date,
    });

    console.log('✅ Registro guardado en DB con ID:', id);

    // Solo planes con módulo legal (FREE+LEGAL, PRO) envían automáticamente al MIR. Plan básico solo guarda y puede descargar XML.
    const countryCodeISO = parsed.data.comunicaciones[0]?.personas[0]?.direccion?.pais
      ? String(parsed.data.comunicaciones[0].personas[0].direccion.pais).substring(0, 2).toUpperCase()
      : undefined;
    let tenant = (tenantId && tenantId !== 'default') ? await getTenantById(tenantId) : null;
    const shouldSendToMir = tenant ? hasLegalModuleAccess(tenant, countryCodeISO) : false;

    let resultadoMIR = null;
    if (shouldSendToMir) {
    try {
      console.log('🚀 Iniciando auto-envío al MIR...');
      
      // Preparar datos para el MIR con estructura correcta según normas MIR
      // pagoType según XSD: tipoPago (obligatorio), fechaPago (opcional), medioPago (opcional), titular (opcional), caducidadTarjeta (opcional)
      const datosMIR = {
        referencia: reserva_ref,  // Incluir la referencia única
        fechaEntrada: fecha_entrada,
        fechaSalida: fecha_salida,
        tipoPago: comunicacion.contrato.pago?.tipoPago || 'EFECT', // tipoPago obligatorio
        pago: {
          tipoPago: comunicacion.contrato.pago?.tipoPago || 'EFECT',
          fechaPago: comunicacion.contrato.pago?.fechaPago, // Opcional según XSD
          medioPago: comunicacion.contrato.pago?.medioPago, // Opcional según XSD
          titular: comunicacion.contrato.pago?.titular, // Opcional según XSD
          caducidadTarjeta: comunicacion.contrato.pago?.caducidadTarjeta // Opcional según XSD
        },
        personas: comunicacion.personas.map(persona => ({
          nombre: persona.nombre,
          apellido1: persona.apellido1,
          apellido2: persona.apellido2 || '',
          tipoDocumento: persona.tipoDocumento || 'NIF',
          numeroDocumento: persona.numeroDocumento || '12345678Z',
          fechaNacimiento: persona.fechaNacimiento,
          nacionalidad: persona.nacionalidad || 'ESP',
          sexo: persona.sexo || 'M',
          contacto: {
            telefono: persona.contacto?.telefono || '',
            correo: persona.contacto?.correo || ''
          },
          direccion: {
            direccion: persona.direccion.direccion,
            codigoPostal: persona.direccion.codigoPostal,
            pais: persona.direccion.pais,
            codigoMunicipio: persona.direccion.codigoMunicipio || '',
            nombreMunicipio: persona.direccion.nombreMunicipio || ''
          }
        }))
      };

      // Enviar al MIR (PV + RH dual) con tenant_id
      const responseMIR = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ministerio/auto-envio-dual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          ...datosMIR,
          tenant_id: tenantId
        })
      });

      if (responseMIR.ok) {
        resultadoMIR = await responseMIR.json();
        console.log('✅ Auto-envío al MIR exitoso:', resultadoMIR);
        
        // Actualizar el registro con el estado del MIR dual (PV + RH) y crear vinculación
        const updatedData = {
          ...dataWithDefaults,
          mir_status: {
            lote: resultadoMIR.resultados?.pv?.lote || resultadoMIR.resultados?.rh?.lote || null,
            codigoComunicacion: resultadoMIR.resultados?.pv?.codigoComunicacion || resultadoMIR.resultados?.rh?.codigoComunicacion || null,
            fechaEnvio: new Date().toISOString(),
            estado: resultadoMIR.estado || 'enviado',
            comunicaciones: resultadoMIR.comunicaciones || [],
            resultados: {
              pv: resultadoMIR.resultados?.pv || null,
              rh: resultadoMIR.resultados?.rh || null
            }
          }
        };
        
        // Usar la referencia única como vinculación
        await sql`
          UPDATE guest_registrations 
          SET 
            data = ${JSON.stringify(updatedData)}::jsonb,
            comunicacion_id = ${reserva_ref}
          WHERE id = ${id}
        `;
        
        console.log('✅ Estado MIR guardado en el registro');
      } else {
        const errorMIR = await responseMIR.json();
        console.error('❌ Error en auto-envío al MIR:', errorMIR);
        resultadoMIR = { error: errorMIR.message || 'Error desconocido' };
        
        // Registrar error en logs del superadmin
        await logError({
          level: 'error',
          message: `Error en auto-envío al MIR desde guest-registration: ${errorMIR.message || 'Error desconocido'}`,
          error: new Error(errorMIR.message || 'Error desconocido'),
          tenantId: tenantId && tenantId !== 'default' ? tenantId : null,
          url: '/api/public/guest-registration',
          metadata: {
            registrationId: id,
            reserva_ref: reserva_ref,
            errorMIR,
            tenantId,
          },
        });
        
        // Actualizar el registro con el error del MIR
        const updatedData = {
          ...dataWithDefaults,
          mir_status: {
            error: errorMIR.message || 'Error desconocido',
            fechaEnvio: new Date().toISOString(),
            estado: 'error'
          }
        };
        
        await sql`
          UPDATE guest_registrations 
          SET data = ${JSON.stringify(updatedData)}::jsonb
          WHERE id = ${id}
        `;
        
        console.log('✅ Error MIR guardado en el registro');
      }
    } catch (errorMIR) {
      console.error('❌ Error en auto-envío al MIR:', errorMIR);
      resultadoMIR = { error: errorMIR instanceof Error ? errorMIR.message : 'Error desconocido' };
      
      // Registrar error en logs del superadmin
      await logError({
        level: 'error',
        message: `Error crítico en auto-envío al MIR desde guest-registration: ${errorMIR instanceof Error ? errorMIR.message : 'Error desconocido'}`,
        error: errorMIR,
        tenantId: tenantId && tenantId !== 'default' ? tenantId : null,
        url: '/api/public/guest-registration',
        metadata: {
          registrationId: id,
          reserva_ref: reserva_ref,
          errorType: 'mir_send_exception',
          tenantId,
        },
      });
      
      // Actualizar el registro con el error del MIR
      const updatedData = {
        ...dataWithDefaults,
        mir_status: {
          error: errorMIR instanceof Error ? errorMIR.message : 'Error desconocido',
          fechaEnvio: new Date().toISOString(),
          estado: 'error'
        }
      };
      
      await sql`
        UPDATE guest_registrations 
        SET data = ${JSON.stringify(updatedData)}::jsonb
        WHERE id = ${id}
      `;
      
      console.log('✅ Error MIR guardado en el registro');
    }
    }

    return NextResponse.json({ 
      success: true, 
      message: shouldSendToMir
        ? 'Registro guardado correctamente en base de datos y enviado al MIR'
        : 'Registro guardado correctamente. Descarga el XML desde el panel para subida manual al Ministerio del Interior.',
      id: id,
      reserva_ref: reserva_ref,
      date: new Date().toISOString().split('T')[0],
      mir: resultadoMIR
    }, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('💥 Error interno del servidor en endpoint público:', error);
    
    // Obtener tenant_id del request
    const tenantId = req.headers.get('x-tenant-id') || null;
    
    // Registrar error en logs del superadmin
    await logError({
      level: 'error',
      message: `Error interno del servidor en guest-registration: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      error,
      tenantId: tenantId && tenantId !== 'default' ? tenantId : null,
      url: '/api/public/guest-registration',
      metadata: {
        errorType: 'internal_server_error',
        tenantId,
      },
    });
    
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 422,
      headers: corsHeaders(req)
    });
  }
}