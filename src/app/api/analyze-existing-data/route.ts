import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Analizando estructura de datos existentes...');
    
    // Simular una estructura de datos típica basada en lo que sabemos
    const estructurasPosibles = {
      // Estructura 1: Datos anidados (como se están guardando ahora)
      estructura1: {
        comunicaciones: [{
          contrato: {
            referencia: "0000146967",
            fechaEntrada: "2024-01-01",
            fechaSalida: "2024-01-02"
          },
          personas: [{
            nombre: "Juan",
            apellido1: "caballo",
            apellido2: "loco",
            tipoDocumento: "PASAPORTE",
            numeroDocumento: "PAO123456-X",
            nacionalidad: "FRA",
            telefono: "123456789",
            correo: "juan@email.com",
            direccion: {
              direccion: "Calle Mayor 123",
              codigoPostal: "28001",
              pais: "ESP",
              codigoMunicipio: "28079",
              nombreMunicipio: "Madrid"
            }
          }]
        }]
      },
      
      // Estructura 2: Datos planos (como podría estar buscando el dashboard)
      estructura2: {
        comunicaciones: [{
          contrato: {
            referencia: "0000146967",
            fechaEntrada: "2024-01-01",
            fechaSalida: "2024-01-02"
          },
          personas: [{
            nombre: "Juan",
            apellido1: "caballo",
            apellido2: "loco",
            tipoDocumento: "PASAPORTE",
            numeroDocumento: "PAO123456-X",
            nacionalidad: "FRA",
            telefono: "123456789",
            correo: "juan@email.com",
            // Datos de dirección como campos separados
            direccion: "Calle Mayor 123",
            codigoPostal: "28001",
            pais: "ESP",
            codigoMunicipio: "28079",
            nombreMunicipio: "Madrid"
          }]
        }]
      },
      
      // Estructura 3: Datos en ubicaciones diferentes
      estructura3: {
        personas: [{
          nombre: "Juan",
          apellido1: "caballo",
          apellido2: "loco",
          tipoDocumento: "PASAPORTE",
          numeroDocumento: "PAO123456-X",
          nacionalidad: "FRA",
          telefono: "123456789",
          correo: "juan@email.com",
          direccion: {
            direccion: "Calle Mayor 123",
            codigoPostal: "28001",
            pais: "ESP",
            codigoMunicipio: "28079",
            nombreMunicipio: "Madrid"
          }
        }],
        contrato: {
          referencia: "0000146967",
          fechaEntrada: "2024-01-01",
          fechaSalida: "2024-01-02"
        }
      }
    };
    
    // Función para extraer datos de cualquier estructura
    const extraerDatosUniversal = (data: any) => {
      const resultados = [];
      
      // Buscar en comunicaciones[0].personas[0]
      if (data?.comunicaciones?.[0]?.personas?.[0]) {
        const persona = data.comunicaciones[0].personas[0];
        resultados.push({
          ubicacion: 'comunicaciones[0].personas[0]',
          datos: persona,
          direccion: persona.direccion
        });
      }
      
      // Buscar en comunicaciones[0].viajeros[0]
      if (data?.comunicaciones?.[0]?.viajeros?.[0]) {
        const viajero = data.comunicaciones[0].viajeros[0];
        resultados.push({
          ubicacion: 'comunicaciones[0].viajeros[0]',
          datos: viajero,
          direccion: viajero.direccion
        });
      }
      
      // Buscar en personas[0]
      if (data?.personas?.[0]) {
        const persona = data.personas[0];
        resultados.push({
          ubicacion: 'personas[0]',
          datos: persona,
          direccion: persona.direccion
        });
      }
      
      // Buscar en viajeros[0]
      if (data?.viajeros?.[0]) {
        const viajero = data.viajeros[0];
        resultados.push({
          ubicacion: 'viajeros[0]',
          datos: viajero,
          direccion: viajero.direccion
        });
      }
      
      return resultados;
    };
    
    type EstructuraKey = keyof typeof estructurasPosibles;
    const claves = Object.keys(estructurasPosibles) as EstructuraKey[];

    // Analizar cada estructura
    const analisis = {
      estructuras: claves.map((key) => ({
        nombre: key,
        datos: estructurasPosibles[key],
        extracciones: extraerDatosUniversal(estructurasPosibles[key]),
      })),
      
      // Función universal para extraer dirección
      extraccionUniversal: (data: any) => {
        const extracciones = extraerDatosUniversal(data);
        
        if (extracciones.length === 0) {
          return {
            encontrado: false,
            mensaje: 'No se encontraron datos de persona'
          };
        }
        
        const primeraExtraccion = extracciones[0];
        const datosPersona = primeraExtraccion.datos;
        const direccionData = primeraExtraccion.direccion;
        
        return {
          encontrado: true,
          ubicacion: primeraExtraccion.ubicacion,
          datosPersona: {
            nombre: datosPersona.nombre || '',
            apellido1: datosPersona.apellido1 || '',
            apellido2: datosPersona.apellido2 || '',
            tipoDocumento: datosPersona.tipoDocumento || '',
            numeroDocumento: datosPersona.numeroDocumento || '',
            nacionalidad: datosPersona.nacionalidad || '',
            telefono: datosPersona.telefono || '',
            correo: datosPersona.correo || ''
          },
          direccion: {
            direccion: direccionData?.direccion || datosPersona.direccion || '',
            codigoPostal: direccionData?.codigoPostal || datosPersona.codigoPostal || '',
            pais: direccionData?.pais || datosPersona.pais || '',
            nombreMunicipio: direccionData?.nombreMunicipio || datosPersona.nombreMunicipio || '',
            codigoMunicipio: direccionData?.codigoMunicipio || datosPersona.codigoMunicipio || ''
          }
        };
      }
    };
    
    return NextResponse.json({
      ok: true,
      analisis,
      mensaje: 'Análisis de estructuras de datos completado'
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
