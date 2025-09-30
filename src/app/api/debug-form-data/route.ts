import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🔬 DEBUG FORM DATA: Analizando datos del formulario...');
    
    const headers = corsHeaders(req);
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      console.error('❌ No se recibieron datos JSON');
      return NextResponse.json({
        ok: false,
        error: 'No se recibieron datos JSON'
      }, { status: 400, headers });
    }
    
    console.log('📋 Datos recibidos del formulario:', JSON.stringify(json, null, 2));
    
    // Analizar estructura de viajeros
    const viajeros = json.viajeros || [];
    console.log(`🔍 Analizando ${viajeros.length} viajeros...`);
    
    viajeros.forEach((viajero: any, index: number) => {
      console.log(`\n👤 Viajero ${index + 1}:`);
      console.log('  📝 Datos básicos:', {
        nombre: viajero.nombre,
        primerApellido: viajero.primerApellido,
        segundoApellido: viajero.segundoApellido,
        fechaNacimiento: viajero.fechaNacimiento,
        tipoDocumento: viajero.tipoDocumento,
        numeroDocumento: viajero.numeroDocumento,
        nacionalidadISO2: viajero.nacionalidadISO2,
        sexo: viajero.sexo,
        telefono: viajero.telefono,
        email: viajero.email
      });
      
      console.log('  📍 Datos de dirección:', {
        direccion: viajero.direccion,
        cp: viajero.cp,
        ine: viajero.ine,
        nombreMunicipio: viajero.nombreMunicipio,
        paisResidencia: viajero.paisResidencia
      });
      
      // Verificar si los campos de dirección están vacíos
      const camposDireccion = ['direccion', 'cp', 'ine', 'nombreMunicipio', 'paisResidencia'];
      const camposVacios = camposDireccion.filter(campo => !viajero[campo] || viajero[campo].toString().trim() === '');
      
      if (camposVacios.length > 0) {
        console.log(`  ⚠️ Campos de dirección vacíos: ${camposVacios.join(', ')}`);
      } else {
        console.log('  ✅ Todos los campos de dirección tienen datos');
      }
    });
    
    // Simular la transformación que hace registro-flex
    const personasDB = viajeros.map((v: any) => ({
      rol: 'VI',
      nombre: v.nombre,
      apellido1: v.primerApellido,
      apellido2: v.segundoApellido,
      tipoDocumento: v.tipoDocumento,
      numeroDocumento: v.numeroDocumento,
      fechaNacimiento: v.fechaNacimiento,
      nacionalidad: v.nacionalidadISO2,
      sexo: v.sexo,
      telefono: v.telefono,
      telefono2: '',
      correo: v.email,
      direccion: {
        direccion: v.direccion,
        codigoPostal: v.cp,
        pais: v.paisResidencia,
        codigoMunicipio: v.ine,
        nombreMunicipio: v.nombreMunicipio || ''
      }
    }));
    
    console.log('🔄 Transformación a formato DB:');
    console.log(JSON.stringify(personasDB, null, 2));
    
    return NextResponse.json({
      ok: true,
      analisis: {
        viajerosRecibidos: viajeros.length,
        estructuraViajeros: viajeros,
        transformacionDB: personasDB,
        problemasEncontrados: viajeros.map((v: any, index: number) => {
          const camposVacios = ['direccion', 'cp', 'ine', 'nombreMunicipio', 'paisResidencia']
            .filter(campo => !v[campo] || v[campo].toString().trim() === '');
          return {
            viajero: index + 1,
            camposVacios: camposVacios,
            tieneDatosDireccion: camposVacios.length === 0
          };
        })
      }
    }, { headers });
    
  } catch (error) {
    console.error('❌ Error en debug form data:', error);
    const headers = corsHeaders(req);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500, headers });
  }
}

const corsHeaders = (req: NextRequest) => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://form.delfincheckin.com',
    'https://admin.delfincheckin.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];
  
  const isAllowed = allowedOrigins.includes(origin) || 
                   origin.startsWith('http://localhost:') || 
                   origin.startsWith('http://127.0.0.1:');
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://form.delfincheckin.com',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400'
  };
};

export async function OPTIONS(req: NextRequest) {
  const headers = corsHeaders(req);
  return new NextResponse(null, {
    status: 200,
    headers
  });
}
