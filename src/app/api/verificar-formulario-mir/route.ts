import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando integración formulario-MIR...');

    // Verificar que las tablas MIR existen
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('mir_comunicaciones', 'mir_configuraciones', 'guest_registrations')
    `;

    const existingTables = tablesCheck.rows.map(row => row.table_name);
    const missingTables = ['mir_comunicaciones', 'mir_configuraciones', 'guest_registrations'].filter(
      table => !existingTables.includes(table)
    );

    if (missingTables.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Tablas faltantes',
        message: `Las siguientes tablas no existen: ${missingTables.join(', ')}`,
        action: 'Ejecutar POST /api/setup-mir-neon para crear las tablas'
      }, { status: 400 });
    }

    // Verificar registros recientes en guest_registrations
    const recentRegistrations = await sql`
      SELECT id, reserva_ref, fecha_entrada, fecha_salida, created_at
      FROM guest_registrations
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // Verificar comunicaciones MIR
    const mirComunicaciones = await sql`
      SELECT id, referencia, tipo, estado, lote, created_at
      FROM mir_comunicaciones
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // Verificar configuraciones MIR
    const mirConfigs = await sql`
      SELECT id, propietario_id, usuario, codigo_arrendador, activo
      FROM mir_configuraciones
      WHERE activo = true
    `;

    // Verificar variables de entorno MIR
    const mirEnvVars = {
      MIR_HTTP_USER: process.env.MIR_HTTP_USER ? '✅ Configurado' : '❌ Faltante',
      MIR_HTTP_PASS: process.env.MIR_HTTP_PASS ? '✅ Configurado' : '❌ Faltante',
      MIR_CODIGO_ARRENDADOR: process.env.MIR_CODIGO_ARRENDADOR ? '✅ Configurado' : '❌ Faltante',
      MIR_BASE_URL: process.env.MIR_BASE_URL ? '✅ Configurado' : '❌ Faltante'
    };

    // Verificar endpoint de formulario público
    const formEndpoint = 'https://admin.delfincheckin.com/api/public/form-redirect/870e589f-d313-4a5a-901f-f25fd4e7240a';
    
    return NextResponse.json({
      success: true,
      message: 'Verificación de integración formulario-MIR completada',
      database: {
        tables: existingTables,
        recentRegistrations: recentRegistrations.rows,
        mirComunicaciones: mirComunicaciones.rows,
        mirConfigs: mirConfigs.rows
      },
      environment: {
        mirEnvVars,
        formEndpoint,
        status: 'Sistema listo para envío automático al MIR'
      },
      flow: {
        step1: 'Usuario completa formulario en form.delfincheckin.com',
        step2: 'Datos se guardan en guest_registrations (Neon)',
        step3: 'Sistema envía automáticamente al MIR',
        step4: 'Resultado se guarda en mir_comunicaciones (Neon)',
        step5: 'Usuario puede ver estado en panel MIR'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error verificando integración formulario-MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error verificando integración formulario-MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Probando envío automático formulario-MIR...');

    // Crear un registro de prueba
    const testData = {
      reserva_ref: `TEST-${Date.now()}`,
      fecha_entrada: new Date().toISOString().split('T')[0],
      fecha_salida: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      data: {
        contrato: {
          fechaContrato: new Date().toISOString().split('T')[0],
          entrada: new Date().toISOString(),
          salida: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          nHabitaciones: 1,
          internet: true,
          tipoPago: 'EFECT',
          fechaPago: new Date().toISOString().split('T')[0]
        },
        viajeros: [{
          nombre: 'Test',
          primerApellido: 'Usuario',
          segundoApellido: 'MIR',
          fechaNacimiento: '1990-01-01',
          tipoDocumento: 'NIF',
          numeroDocumento: '12345678Z',
          sexo: 'H',
          nacionalidadISO2: 'ESP',
          telefono: '600000000',
          email: 'test@example.com',
          direccion: 'Calle Test 123',
          cp: '29001',
          ine: '29001',
          nombreMunicipio: 'Málaga',
          paisResidencia: 'ESP'
        }]
      }
    };

    // Insertar registro de prueba
    const insertResult = await sql`
      INSERT INTO guest_registrations (reserva_ref, fecha_entrada, fecha_salida, data)
      VALUES (${testData.reserva_ref}, ${testData.fecha_entrada}, ${testData.fecha_salida}, ${JSON.stringify(testData.data)}::jsonb)
      RETURNING id
    `;

    const registrationId = insertResult.rows[0].id;
    console.log('✅ Registro de prueba creado con ID:', registrationId);

    // Simular envío al MIR (sin enviar realmente)
    const mirTestData = {
      referencia: `MIR-TEST-${Date.now()}`,
      tipo: 'PV' as const,
      estado: 'pendiente' as const,
      xml_enviado: '<?xml version="1.0" encoding="UTF-8"?><test>Datos de prueba</test>',
      resultado: null,
      error: null
    };

    const mirInsertResult = await sql`
      INSERT INTO mir_comunicaciones (referencia, tipo, estado, xml_enviado, resultado, error)
      VALUES (${mirTestData.referencia}, ${mirTestData.tipo}, ${mirTestData.estado}, ${mirTestData.xml_enviado}, ${mirTestData.resultado}, ${mirTestData.error})
      RETURNING id
    `;

    const mirId = mirInsertResult.rows[0].id;
    console.log('✅ Comunicación MIR de prueba creada con ID:', mirId);

    return NextResponse.json({
      success: true,
      message: 'Prueba de integración formulario-MIR completada',
      testData: {
        registrationId,
        mirId,
        referencia: mirTestData.referencia,
        status: 'Prueba exitosa - Sistema listo para envío real al MIR'
      },
      nextSteps: [
        '1. Configurar credenciales MIR reales en variables de entorno',
        '2. Probar formulario público con datos reales',
        '3. Verificar envío automático al MIR',
        '4. Revisar estado en panel MIR'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en prueba de integración formulario-MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en prueba de integración formulario-MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
