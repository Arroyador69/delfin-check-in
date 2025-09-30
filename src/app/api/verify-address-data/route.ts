import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = (req: NextRequest) => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
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
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://admin.delfincheckin.com',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 VERIFICACIÓN DE DATOS DE DIRECCIÓN: Iniciando análisis...');
    
    const headers = corsHeaders(req);
    
    // Crear cliente de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variables de entorno de Supabase no configuradas');
      return NextResponse.json({
        error: 'Variables de entorno de Supabase no configuradas'
      }, { status: 500, headers });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Obtener todos los registros de guest_registrations
    const { data: registrations, error } = await supabase
      .from('guest_registrations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error al obtener registros:', error);
      return NextResponse.json({
        error: 'Error al obtener registros de la base de datos',
        details: error.message
      }, { status: 500, headers });
    }
    
    console.log(`📊 Total de registros encontrados: ${registrations?.length || 0}`);
    
    // Analizar cada registro
    const analysis = registrations?.map((registration, index) => {
      const data = registration.data;
      console.log(`\n🔍 ANÁLISIS REGISTRO ${index + 1} (ID: ${registration.id}):`);
      console.log('📅 Fecha de creación:', registration.created_at);
      console.log('👤 Nombre del viajero:', registration.viajero?.nombre || 'N/A');
      
      // Buscar datos de dirección en diferentes ubicaciones posibles
      const direccionData = {
        // Ubicación 1: data.comunicaciones[0].personas[0].direccion
        ubicacion1: data?.comunicaciones?.[0]?.personas?.[0]?.direccion || null,
        
        // Ubicación 2: data.comunicaciones[0].personas[0] (campos planos)
        ubicacion2: {
          direccion: data?.comunicaciones?.[0]?.personas?.[0]?.direccion || null,
          codigoPostal: data?.comunicaciones?.[0]?.personas?.[0]?.codigoPostal || null,
          pais: data?.comunicaciones?.[0]?.personas?.[0]?.pais || null,
          codigoMunicipio: data?.comunicaciones?.[0]?.personas?.[0]?.codigoMunicipio || null,
          nombreMunicipio: data?.comunicaciones?.[0]?.personas?.[0]?.nombreMunicipio || null,
        },
        
        // Ubicación 3: data.personas[0]
        ubicacion3: data?.personas?.[0]?.direccion || null,
        
        // Ubicación 4: data.viajeros[0]
        ubicacion4: data?.viajeros?.[0]?.direccion || null,
        
        // Datos completos de la persona
        personaCompleta: data?.comunicaciones?.[0]?.personas?.[0] || null,
        
        // Estructura completa de data
        estructuraCompleta: data
      };
      
      console.log('📍 Datos de dirección encontrados:', JSON.stringify(direccionData, null, 2));
      
      // Verificar si hay datos de dirección
      const tieneDireccion = direccionData.ubicacion1 || 
                            direccionData.ubicacion2.direccion || 
                            direccionData.ubicacion3 || 
                            direccionData.ubicacion4;
      
      const tieneDatosCompletos = direccionData.ubicacion2.direccion && 
                                 direccionData.ubicacion2.codigoPostal && 
                                 direccionData.ubicacion2.pais;
      
      console.log('✅ Tiene datos de dirección:', tieneDireccion);
      console.log('✅ Tiene datos completos:', tieneDatosCompletos);
      
      return {
        id: registration.id,
        createdAt: registration.created_at,
        viajeroNombre: registration.viajero?.nombre || 'N/A',
        viajeroApellido: registration.viajero?.apellido1 || 'N/A',
        tieneDireccion,
        tieneDatosCompletos,
        direccionData,
        estructuraCompleta: data
      };
    }) || [];
    
    // Resumen
    const resumen = {
      totalRegistros: registrations?.length || 0,
      registrosConDireccion: analysis.filter(a => a.tieneDireccion).length,
      registrosConDatosCompletos: analysis.filter(a => a.tieneDatosCompletos).length,
      registrosSinDireccion: analysis.filter(a => !a.tieneDireccion).length
    };
    
    console.log('\n📊 RESUMEN FINAL:');
    console.log('Total de registros:', resumen.totalRegistros);
    console.log('Registros con dirección:', resumen.registrosConDireccion);
    console.log('Registros con datos completos:', resumen.registrosConDatosCompletos);
    console.log('Registros sin dirección:', resumen.registrosSinDireccion);
    
    return NextResponse.json({
      success: true,
      resumen,
      analisis: analysis,
      message: 'Análisis de datos de dirección completado'
    }, { headers });
    
  } catch (error: any) {
    console.error('❌ Error en verificación de datos:', error);
    const headers = corsHeaders(req);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500, headers });
  }
}
