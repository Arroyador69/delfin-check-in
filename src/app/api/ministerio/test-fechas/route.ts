import { NextRequest, NextResponse } from 'next/server';
import { buildPvXml, PvSolicitud } from '@/lib/mir-xml-official';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test: Probando formateo de fechas...');
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      return NextResponse.json({ 
        success: false,
        error: 'Datos JSON inválidos o vacíos' 
      }, { 
        status: 400
      });
    }

    // Formatear fechas correctamente según normas MIR
    const formatearFechaEntrada = (fecha: string): string => {
      try {
        const fechaObj = new Date(fecha);
        if (isNaN(fechaObj.getTime())) {
          throw new Error('Fecha inválida');
        }
        return fechaObj.toISOString().replace(/\.\d{3}Z$/, ''); // YYYY-MM-DDTHH:mm:ss
      } catch (error) {
        console.error('Error formateando fecha entrada:', error);
        return new Date().toISOString().replace(/\.\d{3}Z$/, '');
      }
    };

    const formatearFechaSalida = (fecha: string): string => {
      try {
        const fechaObj = new Date(fecha);
        if (isNaN(fechaObj.getTime())) {
          throw new Error('Fecha inválida');
        }
        return fechaObj.toISOString().replace(/\.\d{3}Z$/, ''); // YYYY-MM-DDTHH:mm:ss
      } catch (error) {
        console.error('Error formateando fecha salida:', error);
        return new Date(Date.now() + 24*60*60*1000).toISOString().replace(/\.\d{3}Z$/, '');
      }
    };

    const fechaEntradaFormateada = formatearFechaEntrada(json.fechaEntrada);
    const fechaSalidaFormateada = formatearFechaSalida(json.fechaSalida);

    // Crear datos de prueba
    const datosMIR: PvSolicitud = {
      codigoEstablecimiento: process.env.MIR_CODIGO_ESTABLECIMIENTO || "0000256653",
      contrato: {
        referencia: "TEST-" + Date.now(),
        fechaContrato: new Date().toISOString().split('T')[0],
        fechaEntrada: fechaEntradaFormateada,
        fechaSalida: fechaSalidaFormateada,
        numPersonas: 1,
        numHabitaciones: 1,
        internet: false,
        pago: {
          tipoPago: "EFECT",
          fechaPago: new Date().toISOString().split('T')[0]
        }
      },
      personas: [{
        rol: "VI",
        nombre: "Test",
        apellido1: "Usuario",
        apellido2: "",
        tipoDocumento: "NIF",
        numeroDocumento: "12345678Z",
        fechaNacimiento: "1985-01-01",
        nacionalidad: "ESP",
        sexo: "M",
        direccion: {
          direccion: "Calle Test 123",
          codigoPostal: "28001",
          pais: "ESP",
          codigoMunicipio: "28079",
          nombreMunicipio: "Madrid"
        },
        telefono: "600000000",
        correo: "test@example.com"
      }]
    };

    console.log('🧪 Datos MIR preparados:', JSON.stringify(datosMIR, null, 2));

    // Intentar generar XML
    try {
      const xmlContent = buildPvXml(datosMIR);
      
      return NextResponse.json({
        success: true,
        message: 'Test de fechas exitoso',
        fechas: {
          entrada_original: json.fechaEntrada,
          salida_original: json.fechaSalida,
          entrada_formateada: fechaEntradaFormateada,
          salida_formateada: fechaSalidaFormateada
        },
        xml_generado: true,
        xml_preview: xmlContent.substring(0, 500) + '...'
      });
      
    } catch (xmlError) {
      return NextResponse.json({
        success: false,
        error: 'Error generando XML',
        message: xmlError instanceof Error ? xmlError.message : 'Error desconocido',
        fechas: {
          entrada_original: json.fechaEntrada,
          salida_original: json.fechaSalida,
          entrada_formateada: fechaEntradaFormateada,
          salida_formateada: fechaSalidaFormateada
        }
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Error en test de fechas:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test de fechas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500
    });
  }
}
