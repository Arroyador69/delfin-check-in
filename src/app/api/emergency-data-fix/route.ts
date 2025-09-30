import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🚨 ANÁLISIS DE EMERGENCIA: Verificando datos de dirección...');
    
    // Simular diferentes estructuras de datos que podrían estar en la base de datos
    const estructurasPosibles = {
      // Estructura 1: Datos como los estamos guardando actualmente
      estructuraActual: {
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
              pais: "ES",
              codigoMunicipio: "28079",
              nombreMunicipio: "Madrid"
            }
          }]
        }]
      },
      
      // Estructura 2: Datos planos (como podría estar en datos antiguos)
      estructuraPlana: {
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
            // Datos de dirección como campos directos
            direccion: "Calle Mayor 123",
            codigoPostal: "28001",
            pais: "ES",
            codigoMunicipio: "28079",
            nombreMunicipio: "Madrid"
          }]
        }]
      },
      
      // Estructura 3: Datos en ubicación diferente
      estructuraAlternativa: {
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
            pais: "ES",
            codigoMunicipio: "28079",
            nombreMunicipio: "Madrid"
          }
        }]
      }
    };
    
    // Función ULTRA ROBUSTA para extraer datos de dirección
    const extraerDireccionUniversal = (data: any) => {
      console.log('🔍 Analizando estructura de datos...');
      
      // Buscar en todas las ubicaciones posibles
      const ubicaciones = [
        'comunicaciones[0].personas[0]',
        'comunicaciones[0].viajeros[0]',
        'personas[0]',
        'viajeros[0]'
      ];
      
      for (const ubicacion of ubicaciones) {
        let persona = null;
        
        try {
          if (ubicacion === 'comunicaciones[0].personas[0]') {
            persona = data?.comunicaciones?.[0]?.personas?.[0];
          } else if (ubicacion === 'comunicaciones[0].viajeros[0]') {
            persona = data?.comunicaciones?.[0]?.viajeros?.[0];
          } else if (ubicacion === 'personas[0]') {
            persona = data?.personas?.[0];
          } else if (ubicacion === 'viajeros[0]') {
            persona = data?.viajeros?.[0];
          }
          
          if (persona) {
            console.log(`✅ Persona encontrada en: ${ubicacion}`);
            
            // Extraer datos de dirección de múltiples formas
            const direccion = {
              direccion: '',
              codigoPostal: '',
              pais: '',
              nombreMunicipio: '',
              codigoMunicipio: ''
            };
            
            // Método 1: Datos en objeto direccion anidado
            if (persona.direccion && typeof persona.direccion === 'object') {
              direccion.direccion = persona.direccion.direccion || '';
              direccion.codigoPostal = persona.direccion.codigoPostal || '';
              direccion.pais = persona.direccion.pais || '';
              direccion.nombreMunicipio = persona.direccion.nombreMunicipio || '';
              direccion.codigoMunicipio = persona.direccion.codigoMunicipio || '';
              console.log('✅ Datos extraídos de objeto direccion anidado');
            }
            
            // Método 2: Datos como campos directos en persona
            if (!direccion.direccion) direccion.direccion = persona.direccion || '';
            if (!direccion.codigoPostal) direccion.codigoPostal = persona.codigoPostal || persona.cp || '';
            if (!direccion.pais) direccion.pais = persona.pais || persona.paisResidencia || '';
            if (!direccion.nombreMunicipio) direccion.nombreMunicipio = persona.nombreMunicipio || persona.municipio || '';
            if (!direccion.codigoMunicipio) direccion.codigoMunicipio = persona.codigoMunicipio || persona.ine || '';
            
            if (direccion.direccion || direccion.codigoPostal || direccion.pais || direccion.codigoMunicipio) {
              console.log('✅ Datos de dirección encontrados');
              return {
                encontrado: true,
                ubicacion,
                datosPersona: {
                  nombre: persona.nombre || '',
                  apellido1: persona.apellido1 || '',
                  apellido2: persona.apellido2 || '',
                  tipoDocumento: persona.tipoDocumento || '',
                  numeroDocumento: persona.numeroDocumento || '',
                  nacionalidad: persona.nacionalidad || '',
                  telefono: persona.telefono || '',
                  correo: persona.correo || ''
                },
                direccion
              };
            }
          }
        } catch (e) {
          console.log(`❌ Error en ${ubicacion}:`, e);
        }
      }
      
      return {
        encontrado: false,
        mensaje: 'No se encontraron datos de dirección en ninguna ubicación'
      };
    };
    
    // Probar con cada estructura
    const resultados = {};
    Object.keys(estructurasPosibles).forEach(key => {
      console.log(`\n🔍 Probando estructura: ${key}`);
      resultados[key] = extraerDireccionUniversal(estructurasPosibles[key]);
    });
    
    return NextResponse.json({
      ok: true,
      estructurasProbadas: Object.keys(estructurasPosibles),
      resultados,
      funcionExtraccion: extraerDireccionUniversal.toString(),
      mensaje: 'Análisis de emergencia completado - Esta función debería encontrar datos de dirección en cualquier estructura'
    });
    
  } catch (error) {
    console.error('❌ Error en análisis de emergencia:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
