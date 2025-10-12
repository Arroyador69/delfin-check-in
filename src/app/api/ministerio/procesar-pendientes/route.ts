import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { MinisterioClientVercel } from '@/lib/ministerio-client-vercel';

/**
 * Procesa todos los registros pendientes de enviar al MIR
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Procesando registros pendientes al MIR...');
    
    // Verificar credenciales
    if (!process.env.MIR_HTTP_USER || !process.env.MIR_HTTP_PASS || !process.env.MIR_CODIGO_ARRENDADOR) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales MIR no configuradas',
        message: 'Falta configurar MIR_HTTP_USER, MIR_HTTP_PASS o MIR_CODIGO_ARRENDADOR'
      }, { status: 400 });
    }

    // Configuración del MIR
    const config = {
      baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER,
      password: process.env.MIR_HTTP_PASS,
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR,
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
      simulacion: false
    };

    // Obtener registros pendientes (sin mir_status o con error)
    const result = await sql`
      SELECT 
        id,
        created_at,
        fecha_entrada,
        fecha_salida,
        data,
        reserva_ref
      FROM guest_registrations 
      WHERE 
        data->>'mir_status' IS NULL
        OR (data->'mir_status'->>'estado' = 'error')
      ORDER BY created_at DESC
    `;

    console.log(`📋 Encontrados ${result.rows.length} registros pendientes`);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: '✅ No hay registros pendientes para procesar',
        procesados: 0,
        exitosos: 0,
        errores: 0,
        detalles: []
      });
    }

    // Crear cliente MIR (versión Vercel)
    const client = new MinisterioClientVercel(config);
    
    let procesados = 0;
    let exitosos = 0;
    let errores = 0;
    const detalles: any[] = [];

    // Procesar cada registro
    for (const registro of result.rows) {
      try {
        procesados++;
        console.log(`\n📝 Procesando registro ${registro.id} (${procesados}/${result.rows.length})`);

        const data = registro.data;
        const viajeros = data.viajeros || [];

        if (viajeros.length === 0) {
          console.log(`⚠️ Registro ${registro.id} sin viajeros, saltando...`);
          detalles.push({
            id: registro.id,
            referencia: registro.reserva_ref,
            estado: 'error',
            error: 'Sin viajeros para enviar'
          });
          errores++;
          continue;
        }

        // Generar referencia única
        const referencia = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Preparar personas para el MIR
        const personas = viajeros.map((viajero: any, index: number) => ({
          rol: index === 0 ? "VI" : "AC", // Primer viajero es VI, resto AC
          nombre: viajero.nombre || viajero.name || "Desconocido",
          apellido1: viajero.apellido1 || viajero.apellidos?.split(' ')[0] || "Desconocido",
          apellido2: viajero.apellido2 || viajero.apellidos?.split(' ')[1] || "",
          tipoDocumento: viajero.tipoDocumento || viajero.tipo_documento || "NIF",
          numeroDocumento: viajero.numeroDocumento || viajero.numero_documento || "00000000X",
          fechaNacimiento: viajero.fechaNacimiento || viajero.fecha_nacimiento || "1990-01-01",
          nacionalidad: viajero.nacionalidad || "ESP",
          sexo: viajero.sexo || "M",
          telefono: viajero.telefono || data.telefono || "600000000",
          correo: viajero.correo || viajero.email || data.email || "noreply@example.com",
          direccion: {
            direccion: viajero.direccion?.direccion || viajero.direccion || "Desconocida",
            codigoPostal: viajero.direccion?.codigoPostal || viajero.codigo_postal || "00000",
            pais: viajero.direccion?.pais || viajero.pais || "ESP",
            codigoMunicipio: viajero.direccion?.codigoMunicipio || viajero.codigo_municipio || "28079",
            nombreMunicipio: viajero.direccion?.nombreMunicipio || viajero.municipio || ""
          }
        }));

        // Preparar datos para el MIR
        const datosMIR = {
          codigoEstablecimiento: "0000256653",
          comunicaciones: [{
            contrato: {
              referencia: referencia,
              fechaContrato: new Date().toISOString().split('T')[0],
              fechaEntrada: registro.fecha_entrada || new Date().toISOString(),
              fechaSalida: registro.fecha_salida || new Date(Date.now() + 24*60*60*1000).toISOString(),
              numPersonas: personas.length,
              numHabitaciones: 1,
              internet: false,
              pago: {
                tipoPago: "EFECT",
                fechaPago: new Date().toISOString().split('T')[0]
              }
            },
            personas: personas
          }]
        };

        console.log(`📤 Enviando ${personas.length} viajeros al MIR...`);
        
        // Enviar al MIR
        const resultado = await client.altaPV(datosMIR);
        
        console.log(`📊 Resultado:`, resultado);

        if (resultado.ok) {
          // Actualizar registro con estado exitoso
          const updatedData = {
            ...data,
            mir_status: {
              lote: resultado.lote || null,
              codigoComunicacion: resultado.codigoComunicacion || null,
              fechaEnvio: new Date().toISOString(),
              estado: 'enviado',
              referencia: referencia
            }
          };

          await sql`
            UPDATE guest_registrations 
            SET data = ${JSON.stringify(updatedData)}::jsonb
            WHERE id = ${registro.id}
          `;

          exitosos++;
          detalles.push({
            id: registro.id,
            referencia: referencia,
            estado: 'exitoso',
            lote: resultado.lote,
            viajeros: personas.length
          });

          console.log(`✅ Registro ${registro.id} procesado exitosamente`);
        } else {
          // Actualizar registro con error
          const updatedData = {
            ...data,
            mir_status: {
              error: resultado.error || 'Error desconocido',
              fechaEnvio: new Date().toISOString(),
              estado: 'error',
              referencia: referencia
            }
          };

          await sql`
            UPDATE guest_registrations 
            SET data = ${JSON.stringify(updatedData)}::jsonb
            WHERE id = ${registro.id}
          `;

          errores++;
          detalles.push({
            id: registro.id,
            referencia: referencia,
            estado: 'error',
            error: resultado.error
          });

          console.log(`❌ Error en registro ${registro.id}:`, resultado.error);
        }

        // Pequeña pausa entre envíos para no saturar el servidor
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Error procesando registro ${registro.id}:`, error);
        errores++;
        detalles.push({
          id: registro.id,
          estado: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    console.log(`\n✅ Procesamiento completado:`);
    console.log(`   Total: ${procesados}`);
    console.log(`   Exitosos: ${exitosos}`);
    console.log(`   Errores: ${errores}`);

    return NextResponse.json({
      success: true,
      message: `✅ Procesamiento completado: ${exitosos} exitosos, ${errores} errores`,
      procesados,
      exitosos,
      errores,
      detalles
    });

  } catch (error) {
    console.error('❌ Error procesando pendientes:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error procesando pendientes',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

