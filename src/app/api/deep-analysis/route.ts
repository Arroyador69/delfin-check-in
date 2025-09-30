import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔬 ANÁLISIS PROFUNDO: Investigando estructura de datos...');
    
    // Simular la respuesta que devuelve la API de guest-registrations
    const apiResponseSimulada = {
      ok: true,
      items: [
        {
          id: "ejemplo-1",
          reserva_ref: "0000146967",
          fecha_entrada: "2024-01-01",
          fecha_salida: "2024-01-02",
          created_at: "2024-01-01T10:00:00Z",
          updated_at: "2024-01-01T10:00:00Z",
          viajero: {
            nombre: "Juan",
            apellido1: "caballo",
            apellido2: "loco",
            nacionalidad: "FRA",
            tipoDocumento: "PASAPORTE",
            numeroDocumento: "PAO123456-X"
          },
          contrato: {
            codigoEstablecimiento: "0000256653",
            referencia: "0000146967",
            numHabitaciones: 1,
            internet: true,
            tipoPago: "TARJT"
          },
          data: {
            codigoEstablecimiento: "0000256653",
            comunicaciones: [{
              contrato: {
                referencia: "0000146967",
                fechaContrato: "2024-01-01",
                fechaEntrada: "2024-01-01T15:00:00",
                fechaSalida: "2024-01-02T11:00:00",
                numPersonas: 1,
                numHabitaciones: 1,
                internet: true,
                pago: {
                  tipoPago: "TARJT",
                  fechaPago: null,
                  medioPago: null,
                  titular: null,
                  caducidadTarjeta: null
                }
              },
              personas: [{
                rol: "VI",
                nombre: "Juan",
                apellido1: "caballo",
                apellido2: "loco",
                tipoDocumento: "PASAPORTE",
                numeroDocumento: "PAO123456-X",
                fechaNacimiento: "1990-01-01",
                nacionalidad: "FRA",
                sexo: "M",
                telefono: "123456789",
                telefono2: "",
                correo: "juan@email.com",
                direccion: {
                  direccion: "Calle Mayor 123",
                  codigoPostal: "28001",
                  pais: "ES",
                  codigoMunicipio: "28079",
                  nombreMunicipio: "Madrid"
                }
              }]
            }]
          }
        }
      ],
      total: 1,
      timestamp: "2024-01-01T10:00:00Z"
    };
    
    // Función para analizar la estructura de datos
    const analizarEstructura = (item: any) => {
      const analisis = {
        id: item.id,
        estructura: {
          nivel1: {
            viajero: item.viajero,
            contrato: item.contrato,
            tieneData: !!item.data
          },
          nivel2: {
            tieneComunicaciones: !!item.data?.comunicaciones,
            cantidadComunicaciones: item.data?.comunicaciones?.length || 0,
            primeraComunicacion: item.data?.comunicaciones?.[0] || null
          },
          nivel3: {
            tienePersonas: !!item.data?.comunicaciones?.[0]?.personas,
            cantidadPersonas: item.data?.comunicaciones?.[0]?.personas?.length || 0,
            primeraPersona: item.data?.comunicaciones?.[0]?.personas?.[0] || null
          },
          nivel4: {
            tieneDireccion: !!item.data?.comunicaciones?.[0]?.personas?.[0]?.direccion,
            direccion: item.data?.comunicaciones?.[0]?.personas?.[0]?.direccion || null
          }
        },
        extraccion: {
          // Método 1: Desde viajero (lo que usa el dashboard actualmente)
          desdeViajero: {
            nombre: item.viajero?.nombre || '',
            apellido1: item.viajero?.apellido1 || '',
            apellido2: item.viajero?.apellido2 || '',
            tipoDocumento: item.viajero?.tipoDocumento || '',
            numeroDocumento: item.viajero?.numeroDocumento || '',
            nacionalidad: item.viajero?.nacionalidad || '',
            // NO HAY DATOS DE DIRECCIÓN AQUÍ
            direccion: {
              direccion: 'NO DISPONIBLE EN VIAJERO',
              codigoPostal: 'NO DISPONIBLE EN VIAJERO',
              pais: 'NO DISPONIBLE EN VIAJERO',
              nombreMunicipio: 'NO DISPONIBLE EN VIAJERO',
              codigoMunicipio: 'NO DISPONIBLE EN VIAJERO'
            }
          },
          // Método 2: Desde data.comunicaciones[0].personas[0] (donde SÍ están los datos)
          desdePersona: {
            nombre: item.data?.comunicaciones?.[0]?.personas?.[0]?.nombre || '',
            apellido1: item.data?.comunicaciones?.[0]?.personas?.[0]?.apellido1 || '',
            apellido2: item.data?.comunicaciones?.[0]?.personas?.[0]?.apellido2 || '',
            tipoDocumento: item.data?.comunicaciones?.[0]?.personas?.[0]?.tipoDocumento || '',
            numeroDocumento: item.data?.comunicaciones?.[0]?.personas?.[0]?.numeroDocumento || '',
            nacionalidad: item.data?.comunicaciones?.[0]?.personas?.[0]?.nacionalidad || '',
            telefono: item.data?.comunicaciones?.[0]?.personas?.[0]?.telefono || '',
            correo: item.data?.comunicaciones?.[0]?.personas?.[0]?.correo || '',
            direccion: {
              direccion: item.data?.comunicaciones?.[0]?.personas?.[0]?.direccion?.direccion || '',
              codigoPostal: item.data?.comunicaciones?.[0]?.personas?.[0]?.direccion?.codigoPostal || '',
              pais: item.data?.comunicaciones?.[0]?.personas?.[0]?.direccion?.pais || '',
              nombreMunicipio: item.data?.comunicaciones?.[0]?.personas?.[0]?.direccion?.nombreMunicipio || '',
              codigoMunicipio: item.data?.comunicaciones?.[0]?.personas?.[0]?.direccion?.codigoMunicipio || ''
            }
          }
        }
      };
      
      return analisis;
    };
    
    // Analizar la estructura
    const analisis = analizarEstructura(apiResponseSimulada.items[0]);
    
    // Función CORRECTA para extraer datos
    const extraerDatosCorrectos = (registration: any) => {
      console.log('🔬 Extrayendo datos correctos...');
      
      // Los datos de dirección están en data.comunicaciones[0].personas[0].direccion
      const persona = registration.data?.comunicaciones?.[0]?.personas?.[0];
      
      if (!persona) {
        console.log('❌ No se encontró persona en data.comunicaciones[0].personas[0]');
        return {
          error: 'No se encontró persona en la estructura esperada'
        };
      }
      
      const direccion = persona.direccion || {};
      
      return {
        nombre: persona.nombre || '',
        apellido1: persona.apellido1 || '',
        apellido2: persona.apellido2 || '',
        tipoDocumento: persona.tipoDocumento || '',
        numeroDocumento: persona.numeroDocumento || '',
        nacionalidad: persona.nacionalidad || '',
        telefono: persona.telefono || '',
        correo: persona.correo || '',
        fechaNacimiento: persona.fechaNacimiento || '',
        direccion: {
          direccion: direccion.direccion || '',
          codigoPostal: direccion.codigoPostal || '',
          pais: direccion.pais || '',
          nombreMunicipio: direccion.nombreMunicipio || '',
          codigoMunicipio: direccion.codigoMunicipio || ''
        }
      };
    };
    
    const datosCorrectos = extraerDatosCorrectos(apiResponseSimulada.items[0]);
    
    return NextResponse.json({
      ok: true,
      problemaIdentificado: {
        descripcion: "Los datos de dirección están en data.comunicaciones[0].personas[0].direccion, pero el dashboard los busca en otras ubicaciones",
        ubicacionCorrecta: "registration.data.comunicaciones[0].personas[0].direccion",
        ubicacionesIncorrectas: [
          "registration.viajero (no tiene datos de dirección)",
          "registration.data.personas[0] (no existe)",
          "registration.data.viajeros[0] (no existe)"
        ]
      },
      analisisEstructura: analisis,
      datosCorrectos: datosCorrectos,
      funcionCorrecta: extraerDatosCorrectos.toString(),
      mensaje: "Análisis profundo completado - Problema identificado"
    });
    
  } catch (error) {
    console.error('❌ Error en análisis profundo:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
