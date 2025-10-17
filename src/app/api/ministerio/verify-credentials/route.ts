import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Verificación de credenciales MIR...');
    
    // Obtener credenciales de las variables de entorno
    const credentials = {
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion'
    };

    console.log('📋 Credenciales configuradas:', {
      username: credentials.username,
      codigoArrendador: credentials.codigoArrendador,
      baseUrl: credentials.baseUrl,
      passwordLength: credentials.password.length,
      hasPassword: !!credentials.password
    });

    // Verificar que todas las credenciales estén configuradas
    const missingCredentials = [];
    if (!credentials.username) missingCredentials.push('MIR_HTTP_USER');
    if (!credentials.password) missingCredentials.push('MIR_HTTP_PASS');
    if (!credentials.codigoArrendador) missingCredentials.push('MIR_CODIGO_ARRENDADOR');

    if (missingCredentials.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales faltantes',
        missing: missingCredentials,
        message: `Faltan las siguientes variables de entorno: ${missingCredentials.join(', ')}`
      }, { status: 400 });
    }

    // Generar diferentes versiones de autenticación para probar
    const authMethods = [
      {
        name: 'Método estándar',
        token: Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64'),
        description: 'Codificación estándar usuario:contraseña'
      },
      {
        name: 'Método con trim',
        token: Buffer.from(`${credentials.username.trim()}:${credentials.password.trim()}`).toString('base64'),
        description: 'Codificación con eliminación de espacios'
      },
      {
        name: 'Método con encoding UTF-8',
        token: Buffer.from(`${credentials.username}:${credentials.password}`, 'utf8').toString('base64'),
        description: 'Codificación explícita UTF-8'
      }
    ];

    // Probar cada método de autenticación
    const testResults = [];

    for (const method of authMethods) {
      try {
        console.log(`🧪 Probando ${method.name}...`);
        
        const authHeader = `Basic ${method.token}`;
        
        // Petición GET simple para probar autenticación
        const response = await fetch(credentials.baseUrl, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'User-Agent': 'Delfin_Check_in/1.0',
            'Accept': 'text/xml, application/xml, */*'
          },
          signal: AbortSignal.timeout(15000)
        });

        const responseText = await response.text();
        
        testResults.push({
          method: method.name,
          description: method.description,
          token: method.token,
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          responseBody: responseText.substring(0, 500),
          headers: Object.fromEntries(response.headers.entries())
        });

        console.log(`📊 ${method.name}: ${response.status} ${response.statusText}`);

      } catch (error) {
        console.error(`❌ Error en ${method.name}:`, error);
        testResults.push({
          method: method.name,
          description: method.description,
          error: error instanceof Error ? error.message : 'Error desconocido',
          success: false
        });
      }
    }

    // Analizar resultados
    const successfulMethods = testResults.filter(r => r.success);
    const failedMethods = testResults.filter(r => !r.success);

    // Determinar el estado general
    let status = 'unknown';
    let message = '';
    
    if (successfulMethods.length > 0) {
      status = 'success';
      message = `✅ Credenciales válidas. Método recomendado: ${successfulMethods[0].method}`;
    } else if (failedMethods.length > 0) {
      // Analizar el tipo de error
      const hasAuthError = failedMethods.some(r => 
        r.status === 401 || 
        r.status === 403 || 
        (r.error && r.error.includes('unauthorized'))
      );
      
      if (hasAuthError) {
        status = 'auth_error';
        message = '❌ Error de autenticación. Las credenciales pueden ser incorrectas o no estar activas.';
      } else {
        status = 'connection_error';
        message = '❌ Error de conexión. Verificar conectividad o configuración de red.';
      }
    }

    return NextResponse.json({
      success: successfulMethods.length > 0,
      status,
      message,
      credentials: {
        username: credentials.username,
        codigoArrendador: credentials.codigoArrendador,
        baseUrl: credentials.baseUrl,
        passwordConfigured: !!credentials.password
      },
      testResults,
      summary: {
        total: testResults.length,
        successful: successfulMethods.length,
        failed: failedMethods.length,
        recommendedMethod: successfulMethods.length > 0 ? successfulMethods[0].method : null
      },
      nextSteps: successfulMethods.length > 0 
        ? ['Usar el método de autenticación recomendado', 'Proceder con el envío de comunicaciones']
        : [
            'Verificar que las credenciales son correctas',
            'Confirmar que el registro en el MIR está completo',
            'Contactar al soporte del MIR si es necesario',
            'Probar desde un entorno diferente'
          ]
    });

  } catch (error) {
    console.error('❌ Error general en verificación:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      message: 'Error interno del servidor durante la verificación'
    }, { status: 500 });
  }
}
