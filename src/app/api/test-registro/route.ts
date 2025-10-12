import { NextRequest, NextResponse } from 'next/server';
import { insertGuestRegistration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test endpoint de registro...');
    
    // Datos de prueba
    const testData = {
      reserva_ref: "0000146967",
      fecha_entrada: "2025-09-12",
      fecha_salida: "2025-09-14",
      data: {
        codigoEstablecimiento: "0000256653",
        comunicaciones: [{
          contrato: {
            referencia: "0000146967",
            fechaContrato: "2025-09-11",
            fechaEntrada: "2025-09-12T13:38:56",
            fechaSalida: "2025-09-14T13:38:59",
            numPersonas: 1,
            numHabitaciones: 1,
            internet: false,
            pago: {
              tipoPago: "EFECTIVO",
              fechaPago: "2025-09-11",
              medioPago: null,
              titular: "Juan ejemplo",
              caducidadTarjeta: "02/2025"
            }
          },
          personas: [{
            rol: 'VI',
            nombre: "Alberto",
            apellido1: "Juan",
            apellido2: "emilio",
            tipoDocumento: "PAS",
            numeroDocumento: "ABC123456",
            fechaNacimiento: "1996-01-11",
            nacionalidad: "ES",
            sexo: "M",
            contacto: {
              telefono: "657897432",
              correo: "contactogoldenbeachrentals@gmail.com"
            },
            direccion: {
              direccion: "calle orejas 34",
              codigoPostal: "29640",
              pais: "ES",
              codigoMunicipio: "29042"
            }
          }]
        }]
      }
    };
    
    console.log('💾 Intentando guardar datos de prueba...');
    
    const id = await insertGuestRegistration(testData);
    
    console.log('✅ Test exitoso - ID:', id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test de registro exitoso',
      id: id,
      testData: testData
    });
    
  } catch (error) {
    console.error('❌ Error en test de registro:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error en test de registro',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
