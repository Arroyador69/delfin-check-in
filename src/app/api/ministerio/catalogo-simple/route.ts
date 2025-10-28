import { NextRequest, NextResponse } from 'next/server';

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

    // Datos simulados para diferentes catálogos
    const catalogosSimulados: Record<string, Array<{codigo: string; descripcion: string}>> = {
      'TIPOS_DOCUMENTO': [
        { codigo: 'NIF', descripcion: 'Número de Identificación Fiscal' },
        { codigo: 'PASAPORTE', descripcion: 'Pasaporte' },
        { codigo: 'DNI', descripcion: 'Documento Nacional de Identidad' },
        { codigo: 'CIF', descripcion: 'Código de Identificación Fiscal' }
      ],
      'TIPOS_PAGO': [
        { codigo: 'EFECTIVO', descripcion: 'Pago en efectivo' },
        { codigo: 'TARJETA', descripcion: 'Pago con tarjeta' },
        { codigo: 'TRANSFERENCIA', descripcion: 'Transferencia bancaria' },
        { codigo: 'CHEQUE', descripcion: 'Pago con cheque' }
      ],
      'PAISES': [
        { codigo: 'ESP', descripcion: 'España' },
        { codigo: 'FRA', descripcion: 'Francia' },
        { codigo: 'DEU', descripcion: 'Alemania' },
        { codigo: 'ITA', descripcion: 'Italia' },
        { codigo: 'GBR', descripcion: 'Reino Unido' }
      ],
      'MUNICIPIOS': [
        { codigo: '28001', descripcion: 'Madrid' },
        { codigo: '08001', descripcion: 'Barcelona' },
        { codigo: '41001', descripcion: 'Sevilla' },
        { codigo: '46001', descripcion: 'Valencia' }
      ],
      'TIPOS_VEHICULO': [
        { codigo: 'COCHE', descripcion: 'Automóvil' },
        { codigo: 'MOTO', descripcion: 'Motocicleta' },
        { codigo: 'FURGONETA', descripcion: 'Furgoneta' },
        { codigo: 'CAMION', descripcion: 'Camión' }
      ],
      'COLORES_VEHICULO': [
        { codigo: 'BLANCO', descripcion: 'Blanco' },
        { codigo: 'NEGRO', descripcion: 'Negro' },
        { codigo: 'ROJO', descripcion: 'Rojo' },
        { codigo: 'AZUL', descripcion: 'Azul' },
        { codigo: 'GRIS', descripcion: 'Gris' }
      ],
      'CATEGORIAS_VEHICULO': [
        { codigo: 'A', descripcion: 'Categoría A' },
        { codigo: 'B', descripcion: 'Categoría B' },
        { codigo: 'C', descripcion: 'Categoría C' },
        { codigo: 'D', descripcion: 'Categoría D' }
      ],
      'ROLES_PERSONA': [
        { codigo: 'ARRENDADOR', descripcion: 'Arrendador' },
        { codigo: 'HUESPED', descripcion: 'Huésped' },
        { codigo: 'ADMINISTRADOR', descripcion: 'Administrador' },
        { codigo: 'RECEPCIONISTA', descripcion: 'Recepcionista' }
      ]
    };

    const elementos = catalogosSimulados[catalogo] || [];

    return NextResponse.json({
      success: true,
      message: 'Consulta de catálogo completada',
      resultado: {
        exito: true,
        codigo: 0,
        descripcion: 'Catálogo consultado correctamente',
        elementos: elementos
      },
      interpretacion: {
        exito: true,
        mensaje: `✅ Catálogo '${catalogo}' consultado correctamente. Encontrados ${elementos.length} elementos`,
        codigo: 0,
        totalElementos: elementos.length
      },
      catalogo: {
        nombre: catalogo,
        descripcion: `Catálogo de ${catalogo.toLowerCase().replace('_', ' ')}`,
        elementos: elementos.map(elem => ({
          codigo: elem.codigo,
          descripcion: elem.descripcion
        }))
      },
      debug: {
        catalogoConsultado: catalogo,
        modo: 'simulacion'
      }
    });

  } catch (error) {
    console.error('❌ Error en consulta de catálogo:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


