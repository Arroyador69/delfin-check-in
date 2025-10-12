import { NextRequest, NextResponse } from 'next/server';
import { create } from 'xmlbuilder2';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test XML corregido - Verificando correcciones MIR...');
    
    // Datos de prueba que simulan los errores del email MIR
    const testData = {
      codigoEstablecimiento: "0000256653",
      comunicaciones: [
        {
          contrato: {
            referencia: `TEST-CORREGIDO-${Date.now()}`,
            fechaContrato: new Date().toISOString().split('T')[0],
            fechaEntrada: new Date().toISOString(),
            fechaSalida: new Date(Date.now() + 24*60*60*1000).toISOString(),
            numPersonas: 3,
            numHabitaciones: 1,
            internet: false,
            pago: {
              tipoPago: "EFECT",
              fechaPago: new Date().toISOString().split('T')[0]
            }
          },
          personas: [
            {
              // COMUNICACIÓN 1: Error sexo 'X' -> debe ser 'H', 'M' o 'O'
              rol: "VI",
              nombre: "Juan",
              apellido1: "García",
              apellido2: "López",
              tipoDocumento: "NIF",
              numeroDocumento: "12345678Z",
              fechaNacimiento: "1985-01-01",
              nacionalidad: "ESP",
              sexo: "X", // ❌ Este valor se debe corregir automáticamente
              telefono: "600123456",
              correo: "juan@example.com",
              direccion: {
                direccion: "Calle Mayor 123",
                codigoPostal: "28001",
                pais: "ESP",
                codigoMunicipio: "28079"
              }
            },
            {
              // COMUNICACIÓN 2: Error soporteDocumento faltante para NIF
              rol: "VI",
              nombre: "María",
              apellido1: "Rodríguez",
              apellido2: "Sánchez",
              tipoDocumento: "NIF",
              numeroDocumento: "87654321A",
              fechaNacimiento: "1990-05-15",
              nacionalidad: "ESP",
              sexo: "M",
              telefono: "600654321",
              correo: "maria@example.com",
              direccion: {
                direccion: "Avenida Principal 456",
                codigoPostal: "28002",
                pais: "ESP",
                codigoMunicipio: "28080"
              }
              // ❌ soporteDocumento faltante - se debe agregar automáticamente
            },
            {
              // COMUNICACIÓN 3: Error soporteDocumento faltante para NIE
              rol: "VI",
              nombre: "Carlos",
              apellido1: "Martín",
              apellido2: "González",
              tipoDocumento: "NIE",
              numeroDocumento: "X1234567L",
              fechaNacimiento: "1988-12-03",
              nacionalidad: "ESP",
              sexo: "H",
              telefono: "600987654",
              correo: "carlos@example.com",
              direccion: {
                direccion: "Plaza Central 789",
                codigoPostal: "28003",
                pais: "ESP",
                codigoMunicipio: "28081"
              }
              // ❌ soporteDocumento faltante - se debe agregar automáticamente
            }
          ]
        }
      ]
    };

    console.log('📋 Datos de prueba (con errores intencionados):', JSON.stringify(testData, null, 2));

    // Aplicar las correcciones
    const correctedData = {
      ...testData,
      comunicaciones: testData.comunicaciones.map(comunicacion => ({
        ...comunicacion,
        personas: comunicacion.personas.map(persona => {
          const corrected = { ...persona };
          
          // CORRECCIÓN 1: sexo 'X' -> 'O' (Otro)
          if (corrected.sexo === 'X') {
            corrected.sexo = 'O';
            console.log('🔧 CORRECCIÓN 1: sexo "X" → "O"');
          }
          
          // CORRECCIÓN 2: soporteDocumento para NIF/NIE
          if ((corrected.tipoDocumento === 'NIF' || corrected.tipoDocumento === 'NIE') && !corrected.soporteDocumento) {
            corrected.soporteDocumento = 'C';
            console.log(`🔧 CORRECCIÓN 2: soporteDocumento "C" agregado para ${corrected.tipoDocumento}`);
          }
          
          return corrected;
        })
      }))
    };

    console.log('✅ Datos corregidos:', JSON.stringify(correctedData, null, 2));

    // Generar XML usando xmlbuilder2
    const root = {
      peticion: {
        solicitud: {
          codigoEstablecimiento: correctedData.codigoEstablecimiento,
          comunicacion: correctedData.comunicaciones.map(c => ({
            contrato: {
              referencia: c.contrato.referencia,
              fechaContrato: c.contrato.fechaContrato,
              fechaEntrada: c.contrato.fechaEntrada,
              fechaSalida: c.contrato.fechaSalida,
              numPersonas: String(c.contrato.numPersonas),
              numHabitaciones: String(c.contrato.numHabitaciones),
              internet: c.contrato.internet ? 'true' : 'false',
              pago: {
                tipoPago: c.contrato.pago.tipoPago,
                fechaPago: c.contrato.pago.fechaPago
              }
            },
            persona: c.personas.map(p => ({
              rol: p.rol,
              nombre: p.nombre,
              apellido1: p.apellido1,
              apellido2: p.apellido2,
              tipoDocumento: p.tipoDocumento,
              numeroDocumento: p.numeroDocumento,
              ...(p.soporteDocumento && { soporteDocumento: p.soporteDocumento }),
              fechaNacimiento: p.fechaNacimiento,
              nacionalidad: p.nacionalidad,
              sexo: p.sexo,
              telefono: p.telefono,
              correo: p.correo,
              direccion: {
                direccion: p.direccion.direccion,
                codigoPostal: p.direccion.codigoPostal,
                pais: p.direccion.pais,
                codigoMunicipio: p.direccion.codigoMunicipio
              }
            }))
          }))
        }
      }
    };

    const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele(root);
    const xml = doc.end({ prettyPrint: true });
    
    console.log('📄 XML generado:', xml.substring(0, 1000) + '...');

    return NextResponse.json({
      success: true,
      message: '✅ Test XML corregido exitoso',
      correcciones: [
        '✅ Error 1: sexo "X" → "O" (comunicación 1)',
        '✅ Error 2: soporteDocumento "C" agregado (comunicación 2 - NIF)',
        '✅ Error 3: soporteDocumento "C" agregado (comunicación 3 - NIE)'
      ],
      datosOriginales: testData,
      datosCorregidos: correctedData,
      xmlGenerado: xml
    });

  } catch (error) {
    console.error('❌ Error en test XML corregido:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test XML corregido',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
