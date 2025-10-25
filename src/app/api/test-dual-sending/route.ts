import { NextRequest, NextResponse } from 'next/server';
import { buildPvXml, PvSolicitud } from '@/lib/mir-xml-official';
import { buildRhXml, RhSolicitud } from '@/lib/mir-xml-rh';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test de envío dual (PV + RH) iniciado...');
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      console.error('❌ Datos JSON inválidos o vacíos');
      return NextResponse.json({ 
        error: 'Datos JSON inválidos o vacíos' 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('📋 Datos recibidos para test:', JSON.stringify(json, null, 2));

    // Datos de prueba
    const testData = {
      codigoEstablecimiento: "0000256653",
      contrato: {
        referencia: `TEST-${Date.now()}`,
        fechaContrato: new Date().toISOString().split('T')[0],
        fechaEntrada: new Date().toISOString().replace(/\.\d{3}Z$/, ''),
        fechaSalida: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, ''),
        numPersonas: 2,
        numHabitaciones: 1,
        internet: false,
        pago: {
          tipoPago: "EFECT",
          fechaPago: new Date().toISOString().split('T')[0]
        }
      },
      personas: [
        {
          rol: "VI",
          nombre: "Juan",
          apellido1: "García",
          apellido2: "López",
          tipoDocumento: "NIF",
          numeroDocumento: "12345678Z",
          soporteDocumento: "12345678Z",
          fechaNacimiento: "1985-01-01",
          nacionalidad: "ESP",
          sexo: "M",
          direccion: {
            direccion: "Calle Ejemplo 123",
            codigoPostal: "28001",
            pais: "ESP",
            codigoMunicipio: "28079",
            nombreMunicipio: "Madrid"
          },
          telefono: "600000000",
          correo: "juan@example.com"
        },
        {
          rol: "VI",
          nombre: "María",
          apellido1: "García",
          apellido2: "López",
          tipoDocumento: "NIF",
          numeroDocumento: "87654321Y",
          soporteDocumento: "87654321Y",
          fechaNacimiento: "1987-05-15",
          nacionalidad: "ESP",
          sexo: "F",
          direccion: {
            direccion: "Calle Ejemplo 123",
            codigoPostal: "28001",
            pais: "ESP",
            codigoMunicipio: "28079",
            nombreMunicipio: "Madrid"
          },
          telefono: "600000001",
          correo: "maria@example.com",
          parentesco: "ESPOSA"
        }
      ]
    };

    // Generar XML para PV
    console.log('📄 Generando XML para PV...');
    const pvData: PvSolicitud = {
      codigoEstablecimiento: testData.codigoEstablecimiento,
      contrato: testData.contrato,
      personas: testData.personas.map(p => ({
        ...p,
        rol: "VI" // Todos son viajeros en PV
      }))
    };
    
    const pvXml = buildPvXml(pvData);
    console.log('✅ XML PV generado correctamente');

    // Generar XML para RH
    console.log('📄 Generando XML para RH...');
    const rhData: RhSolicitud = {
      codigoEstablecimiento: testData.codigoEstablecimiento,
      contrato: testData.contrato,
      personas: testData.personas.map((p, index) => ({
        ...p,
        rol: index === 0 ? "TI" : "VI" // Primer viajero es titular, resto son viajeros
      }))
    };
    
    const rhXml = buildRhXml(rhData);
    console.log('✅ XML RH generado correctamente');

    // Comparar diferencias entre PV y RH
    const pvLines = pvXml.split('\n');
    const rhLines = rhXml.split('\n');
    
    const differences = [];
    const maxLines = Math.max(pvLines.length, rhLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const pvLine = pvLines[i] || '';
      const rhLine = rhLines[i] || '';
      
      if (pvLine !== rhLine) {
        differences.push({
          line: i + 1,
          pv: pvLine,
          rh: rhLine
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test de generación dual (PV + RH) completado exitosamente',
      resultados: {
        pv: {
          generado: true,
          longitud: pvXml.length,
          lineas: pvLines.length,
          preview: pvXml.substring(0, 500) + '...'
        },
        rh: {
          generado: true,
          longitud: rhXml.length,
          lineas: rhLines.length,
          preview: rhXml.substring(0, 500) + '...'
        },
        diferencias: {
          total: differences.length,
          principales: differences.slice(0, 10) // Primeras 10 diferencias
        }
      },
      validacion: {
        pv_valido: pvXml.includes('altaParteHospedaje') && pvXml.includes('rol>VI<'),
        rh_valido: rhXml.includes('altaReservaHospedaje') && rhXml.includes('rol>TI<'),
        ambos_validos: pvXml.includes('altaParteHospedaje') && rhXml.includes('altaReservaHospedaje')
      },
      debug: {
        datos_entrada: testData,
        diferencias_completas: differences
      }
    });

  } catch (error) {
    console.error('❌ Error en test dual:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test dual',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
