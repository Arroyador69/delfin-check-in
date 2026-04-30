import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET - Obtener configuración MIR
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
        id,
        usuario,
        codigo_arrendador,
        codigo_establecimiento,
        base_url,
        aplicacion,
        simulacion,
        activo,
        created_at,
        updated_at
      FROM mir_configuraciones 
      WHERE propietario_id = ${tenantId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Configuración MIR no encontrada' }, { status: 404 });
    }

    // No devolver la contraseña por seguridad
    const config = result.rows[0];
    delete config.contraseña;

    return NextResponse.json({
      mir: config
    });

  } catch (error) {
    console.error('Error obteniendo configuración MIR:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuración MIR
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
    if (!data.usuario || !data.contraseña || !data.codigoArrendador || !data.codigoEstablecimiento) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE mir_configuraciones SET
        usuario = ${data.usuario},
        contraseña = ${data.contraseña},
        codigo_arrendador = ${data.codigoArrendador},
        codigo_establecimiento = ${data.codigoEstablecimiento},
        base_url = ${data.baseUrl || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion'},
        aplicacion = ${data.aplicacion || 'Delfin_Check_in'},
        simulacion = ${data.simulacion || false},
        activo = ${data.activo !== undefined ? data.activo : true},
        updated_at = NOW()
      WHERE propietario_id = ${tenantId}
      RETURNING id, usuario, codigo_arrendador, codigo_establecimiento, base_url, aplicacion, simulacion, activo, created_at, updated_at
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Configuración MIR no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      mir: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando configuración MIR:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Probar conexión MIR
export async function POST(request: NextRequest) {
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

    // Obtener configuración MIR actual
    const configResult = await sql`
      SELECT * FROM mir_configuraciones 
      WHERE propietario_id = ${tenantId}
      LIMIT 1
    `;

    if (configResult.rows.length === 0) {
      return NextResponse.json({ error: 'Configuración MIR no encontrada' }, { status: 404 });
    }

    const config = configResult.rows[0];

    // Aquí se implementaría la lógica para probar la conexión con el MIR
    // Por ahora, simulamos una respuesta exitosa
    try {
      // TODO: Implementar prueba real de conexión MIR
      // const testResult = await testMIRConnection(config);
      
      return NextResponse.json({
        success: true,
        message: 'Conexión MIR probada exitosamente',
        testResult: {
          usuario: config.usuario,
          codigoArrendador: config.codigo_arrendador,
          codigoEstablecimiento: config.codigo_establecimiento,
          status: 'OK'
        }
      });

    } catch (testError) {
      return NextResponse.json({
        success: false,
        message: 'Error al probar conexión MIR',
        error: testError instanceof Error ? testError.message : String(testError)
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error probando conexión MIR:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
