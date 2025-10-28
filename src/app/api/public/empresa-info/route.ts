import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * API pública para obtener información de la empresa por tenant_id
 * Usado por el formulario público para mostrar datos legales
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id es requerido' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    // Obtener configuración de empresa desde la base de datos
    const empresaResult = await sql`
      SELECT 
        nombre_empresa,
        nif_empresa,
        direccion_empresa,
        codigo_postal,
        ciudad,
        provincia,
        pais,
        telefono,
        email,
        web
      FROM empresa_config 
      WHERE tenant_id = ${tenantId}
      LIMIT 1
    `;

    if (empresaResult.rows.length === 0) {
      // Si no hay configuración específica, usar datos por defecto
      return NextResponse.json({
        empresa: {
          nombre_empresa: 'Delfín Check-in',
          nif_empresa: 'B-12345678',
          direccion_empresa: 'Dirección no configurada',
          codigo_postal: '00000',
          ciudad: 'Ciudad no configurada',
          provincia: 'Provincia no configurada',
          pais: 'España',
          telefono: '+34 900 000 000',
          email: 'info@delfincheckin.com',
          web: 'https://delfincheckin.com'
        }
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const empresa = empresaResult.rows[0];

    return NextResponse.json({
      empresa: {
        nombre_empresa: empresa.nombre_empresa || 'Delfín Check-in',
        nif_empresa: empresa.nif_empresa || 'B-12345678',
        direccion_empresa: empresa.direccion_empresa || 'Dirección no configurada',
        codigo_postal: empresa.codigo_postal || '00000',
        ciudad: empresa.ciudad || 'Ciudad no configurada',
        provincia: empresa.provincia || 'Provincia no configurada',
        pais: empresa.pais || 'España',
        telefono: empresa.telefono || '+34 900 000 000',
        email: empresa.email || 'info@delfincheckin.com',
        web: empresa.web || 'https://delfincheckin.com'
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    console.error('Error al obtener información de empresa:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

// Manejar preflight requests (OPTIONS)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
