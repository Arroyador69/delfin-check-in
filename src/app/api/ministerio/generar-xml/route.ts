import { NextRequest, NextResponse } from 'next/server';
import { buildPvXml, PvSolicitud } from '@/lib/mir-xml-official';

export async function POST(req: NextRequest) {
  try {
    console.log('📄 Generando XML MIR...');
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      console.error('❌ Datos JSON inválidos o vacíos');
      return NextResponse.json({ 
        success: false,
        error: 'Datos JSON inválidos o vacíos' 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('📋 Datos recibidos para generar XML:', JSON.stringify(json, null, 2));

    // Extraer datos del registro
    const personas = json.personas || [];
    if (personas.length === 0) {
      throw new Error('No se encontraron datos de personas en el registro');
    }

    // Generar referencia única
    const referencia = `XML-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Preparar datos para el MIR según esquemas oficiales
    const datosMIR: PvSolicitud = {
      codigoEstablecimiento: process.env.MIR_CODIGO_ARRENDADOR || "0000256653",
      contrato: {
        referencia: referencia,
        fechaContrato: new Date().toISOString().split('T')[0], // xsd:date (YYYY-MM-DD)
        fechaEntrada: json.fechaEntrada || new Date().toISOString().replace(/\.\d{3}Z$/, ''), // xsd:dateTime (YYYY-MM-DDTHH:mm:ss)
        fechaSalida: json.fechaSalida || new Date(Date.now() + 24*60*60*1000).toISOString().replace(/\.\d{3}Z$/, ''), // xsd:dateTime (YYYY-MM-DDTHH:mm:ss)
        numPersonas: personas.length,
        numHabitaciones: 1,
        internet: false,
        pago: {
          tipoPago: "EFECT",
          fechaPago: new Date().toISOString().split('T')[0] // xsd:date (YYYY-MM-DD)
        }
      },
      personas: personas.map((persona: any) => ({
        rol: "VI",
        nombre: persona.nombre || "Viajero",
        apellido1: persona.apellido1 || "Apellido1",
        apellido2: persona.apellido2 || "",
        tipoDocumento: persona.tipoDocumento || "NIF",
        numeroDocumento: persona.numeroDocumento || "12345678Z",
        fechaNacimiento: persona.fechaNacimiento || "1985-01-01",
        nacionalidad: persona.nacionalidad || "ESP",
        sexo: persona.sexo || "M",
        direccion: {
          direccion: persona.direccion?.direccion || "Calle Ejemplo 123",
          codigoPostal: persona.direccion?.codigoPostal || "28001",
          pais: persona.direccion?.pais || "ESP",
          codigoMunicipio: persona.direccion?.codigoMunicipio || "28079",
          nombreMunicipio: persona.direccion?.nombreMunicipio || "Madrid"
        },
        telefono: persona.contacto?.telefono || "600000000",
        correo: persona.contacto?.correo || "viajero@example.com"
      }))
    };

    console.log('📤 Preparando datos MIR oficiales para XML:', JSON.stringify(datosMIR, null, 2));

    // Generar XML según esquemas oficiales
    const xmlContent = buildPvXml(datosMIR);
    console.log('📄 XML generado (primeros 1000 chars):', xmlContent.substring(0, 1000));

    return NextResponse.json({
      success: true,
      message: 'XML generado correctamente según normas MIR',
      xml: xmlContent,
      referencia: referencia,
      datos: datosMIR
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error generando XML MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error generando XML MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
