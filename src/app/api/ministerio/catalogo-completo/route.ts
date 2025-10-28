import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { nombreCatalogo } = await req.json();
    
    console.log('📋 Consultando catálogo:', nombreCatalogo);
    
    // Catálogos válidos según las normas MIR
    const catalogosValidos = [
      'TIPOS_DOCUMENTO',
      'TIPOS_PAGO', 
      'PAISES',
      'MUNICIPIOS',
      'TIPOS_ESTABLECIMIENTO',
      'ROLES_PERSONA'
    ];
    
    if (!catalogosValidos.includes(nombreCatalogo)) {
      return NextResponse.json({
        ok: false,
        error: `Catálogo '${nombreCatalogo}' no válido. Catálogos disponibles: ${catalogosValidos.join(', ')}`
      }, { status: 400 });
    }
    
    // Simular datos del catálogo según las normas MIR
    const datosCatalogo = generarDatosCatalogo(nombreCatalogo);
    
    return NextResponse.json({
      ok: true,
      catalogo: {
        nombre: nombreCatalogo,
        descripcion: obtenerDescripcionCatalogo(nombreCatalogo),
        elementos: datosCatalogo,
        totalElementos: datosCatalogo.length,
        fechaActualizacion: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error consultando catálogo:', error);
    return NextResponse.json({
      ok: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

function generarDatosCatalogo(nombreCatalogo: string) {
  switch (nombreCatalogo) {
    case 'TIPOS_DOCUMENTO':
      return [
        { codigo: 'NIF', descripcion: 'Número de Identificación Fiscal', activo: true },
        { codigo: 'NIE', descripcion: 'Número de Identidad de Extranjero', activo: true },
        { codigo: 'PAS', descripcion: 'Pasaporte', activo: true },
        { codigo: 'DNI', descripcion: 'Documento Nacional de Identidad', activo: true },
        { codigo: 'CIF', descripcion: 'Código de Identificación Fiscal', activo: true }
      ];
      
    case 'TIPOS_PAGO':
      return [
        { codigo: 'EFECT', descripcion: 'Efectivo', activo: true },
        { codigo: 'TARJ', descripcion: 'Tarjeta', activo: true },
        { codigo: 'TRANS', descripcion: 'Transferencia', activo: true },
        { codigo: 'CHEQ', descripcion: 'Cheque', activo: true },
        { codigo: 'BONO', descripcion: 'Bono/Vales', activo: true }
      ];
      
    case 'PAISES':
      return [
        { codigo: 'ESP', descripcion: 'España', activo: true },
        { codigo: 'FRA', descripcion: 'Francia', activo: true },
        { codigo: 'DEU', descripcion: 'Alemania', activo: true },
        { codigo: 'GBR', descripcion: 'Reino Unido', activo: true },
        { codigo: 'ITA', descripcion: 'Italia', activo: true },
        { codigo: 'USA', descripcion: 'Estados Unidos', activo: true }
      ];
      
    case 'MUNICIPIOS':
      return [
        { codigo: '29067', descripcion: 'Málaga', provincia: 'Málaga', activo: true },
        { codigo: '28079', descripcion: 'Madrid', provincia: 'Madrid', activo: true },
        { codigo: '08019', descripcion: 'Barcelona', provincia: 'Barcelona', activo: true },
        { codigo: '46015', descripcion: 'Valencia', provincia: 'Valencia', activo: true },
        { codigo: '41091', descripcion: 'Sevilla', provincia: 'Sevilla', activo: true }
      ];
      
    case 'TIPOS_ESTABLECIMIENTO':
      return [
        { codigo: 'HOTEL', descripcion: 'Hotel', activo: true },
        { codigo: 'APART', descripcion: 'Apartamento', activo: true },
        { codigo: 'CASA', descripcion: 'Casa Vacacional', activo: true },
        { codigo: 'CAMP', descripcion: 'Camping', activo: true },
        { codigo: 'ALBER', descripcion: 'Albergue', activo: true }
      ];
      
    case 'ROLES_PERSONA':
      return [
        { codigo: 'VI', descripcion: 'Viajero', activo: true },
        { codigo: 'AR', descripcion: 'Arrendador', activo: true },
        { codigo: 'RE', descripcion: 'Representante', activo: true },
        { codigo: 'CO', descripcion: 'Contacto', activo: true }
      ];
      
    default:
      return [];
  }
}

function obtenerDescripcionCatalogo(nombreCatalogo: string): string {
  const descripciones = {
    'TIPOS_DOCUMENTO': 'Tipos de documento de identidad válidos para el registro',
    'TIPOS_PAGO': 'Modalidades de pago aceptadas en establecimientos',
    'PAISES': 'Países reconocidos por el sistema MIR',
    'MUNICIPIOS': 'Municipios españoles con código INE',
    'TIPOS_ESTABLECIMIENTO': 'Clasificación de tipos de establecimientos de hospedaje',
    'ROLES_PERSONA': 'Roles que pueden tener las personas en las comunicaciones'
  };
  
  return descripciones[nombreCatalogo] || 'Catálogo del sistema MIR';
}


