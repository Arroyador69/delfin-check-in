import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';

export async function POST(req: NextRequest) {
  try {
    console.log('📚 Consulta de catálogo MIR iniciada...');
    
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

    const { catalogo } = json;
    
    if (!catalogo || typeof catalogo !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Nombre de catálogo requerido',
        message: 'Debe proporcionar el nombre del catálogo a consultar'
      }, { status: 400 });
    }

    console.log('📋 Consultando catálogo:', catalogo);

    // Verificar credenciales MIR
    if (!process.env.MIR_HTTP_USER || !process.env.MIR_HTTP_PASS || !process.env.MIR_CODIGO_ARRENDADOR) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales MIR no configuradas',
        message: 'Falta configurar MIR_HTTP_USER, MIR_HTTP_PASS o MIR_CODIGO_ARRENDADOR'
      }, { status: 400 });
    }

    // Configuración del MIR con credenciales correctas
    const config = {
      baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER,
      password: process.env.MIR_HTTP_PASS,
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR,
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
      simulacion: process.env.MIR_SIMULACION === 'true'
    };

    console.log('📋 Configuración MIR oficial para catálogo:', {
      baseUrl: config.baseUrl,
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      simulacion: config.simulacion
    });

    // Crear cliente MIR oficial
    const client = new MinisterioClientOfficial(config);
    
    // Consultar catálogo
    const resultado = await client.consultaCatalogo({ catalogo });
    
    console.log('✅ Resultado de la consulta de catálogo:', resultado);

    return NextResponse.json({
      success: true,
      message: 'Consulta de catálogo completada',
      resultado: {
        exito: resultado.ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion,
        elementos: resultado.elementos
      },
      interpretacion: {
        exito: resultado.ok,
        mensaje: resultado.ok ? 
          `✅ Catálogo '${catalogo}' consultado correctamente. Encontrados ${resultado.elementos.length} elementos` : 
          `❌ Error consultando catálogo: ${resultado.descripcion}`,
        codigo: resultado.codigo,
        totalElementos: resultado.elementos.length
      },
      catalogo: {
        nombre: catalogo,
        descripcion: getCatalogoDescripcion(catalogo),
        elementos: resultado.elementos.map(elem => ({
          codigo: elem.codigo,
          descripcion: elem.descripcion,
          interpretacion: getElementoInterpretacion(catalogo, elem.codigo)
        }))
      },
      debug: {
        catalogoConsultado: catalogo,
        config: {
          baseUrl: config.baseUrl,
          username: config.username,
          codigoArrendador: config.codigoArrendador,
          simulacion: config.simulacion
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en consulta de catálogo:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en consulta de catálogo',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function getCatalogoDescripcion(catalogo: string): string {
  const catalogos: Record<string, string> = {
    'TIPOS_DOCUMENTO': 'Tipos de documento de identidad válidos',
    'TIPOS_PAGO': 'Tipos de pago aceptados',
    'PAISES': 'Códigos de países ISO 3166-1 Alpha-3',
    'MUNICIPIOS': 'Códigos de municipios según INE',
    'TIPOS_VEHICULO': 'Tipos de vehículos para alquiler',
    'COLORES_VEHICULO': 'Colores de vehículos',
    'CATEGORIAS_VEHICULO': 'Categorías de vehículos',
    'ROLES_PERSONA': 'Roles de persona en las comunicaciones'
  };
  return catalogos[catalogo] || `Catálogo: ${catalogo}`;
}

function getElementoInterpretacion(catalogo: string, codigo: string): string {
  // Interpretaciones específicas para códigos comunes
  const interpretaciones: Record<string, Record<string, string>> = {
    'TIPOS_DOCUMENTO': {
      'NIF': 'Número de Identificación Fiscal (España)',
      'NIE': 'Número de Identidad de Extranjero (España)',
      'PAS': 'Pasaporte',
      'DNI': 'Documento Nacional de Identidad'
    },
    'TIPOS_PAGO': {
      'EFECT': 'Pago en efectivo',
      'TARJ': 'Pago con tarjeta',
      'TRANSF': 'Transferencia bancaria',
      'CHEQ': 'Cheque'
    },
    'ROLES_PERSONA': {
      'VI': 'Viajero',
      'CP': 'Contacto Principal',
      'CS': 'Contacto Secundario',
      'TI': 'Titular'
    }
  };
  
  return interpretaciones[catalogo]?.[codigo] || `Código: ${codigo}`;
}

