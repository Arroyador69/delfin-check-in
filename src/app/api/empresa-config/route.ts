import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET - Obtener configuración de empresa
export async function GET(request: NextRequest) {
  try {
    // Obtener el token de autenticación de las cookies
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar el token JWT
    const payload = verifyToken(authToken);
    
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = payload.tenantId;

    const result = await sql`
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
        web,
        created_at,
        updated_at
      FROM empresa_config 
      WHERE tenant_id = ${tenantId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      empresa: result.rows[0]
    });

  } catch (error) {
    console.error('Error obteniendo configuración de empresa:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuración de empresa
export async function PUT(request: NextRequest) {
  try {
    // Obtener el token de autenticación de las cookies
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar el token JWT
    const payload = verifyToken(authToken);
    
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = payload.tenantId;
    const data = await request.json();

    // Validar datos requeridos
    if (!data.nombreEmpresa || !data.nifEmpresa || !data.direccionEmpresa || 
        !data.codigoPostal || !data.ciudad || !data.provincia || 
        !data.telefono || !data.email) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE empresa_config SET
        nombre_empresa = ${data.nombreEmpresa},
        nif_empresa = ${data.nifEmpresa},
        direccion_empresa = ${data.direccionEmpresa},
        codigo_postal = ${data.codigoPostal},
        ciudad = ${data.ciudad},
        provincia = ${data.provincia},
        pais = ${data.pais || 'España'},
        telefono = ${data.telefono},
        email = ${data.email},
        web = ${data.web || ''},
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      empresa: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando configuración de empresa:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}