import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Consulta oficial de comunicaciones MIR iniciada...');
    
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

    const { codigos } = json;
    
    if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Códigos de comunicación requeridos',
        message: 'Debe proporcionar un array de códigos de comunicación'
      }, { status: 400 });
    }

    console.log('📋 Consultando códigos:', codigos);

    // Procesar códigos para cumplir con maxLength de 36 caracteres del MIR
    const codigosProcesados = codigos.map(codigo => {
      // Si el código tiene formato REF-UUID-timestamp, extraer solo el UUID
      if (codigo.startsWith('REF-') && codigo.length > 36) {
        const parts = codigo.split('-');
        if (parts.length >= 5) {
          // Extraer UUID: REF-UUID-timestamp -> UUID
          const uuid = parts.slice(1, 5).join('-'); // UUID tiene 4 partes separadas por -
          console.log(`🔧 Procesando código: ${codigo} -> ${uuid}`);
          return uuid;
        }
      }
      // Si ya es de 36 caracteres o menos, usar tal como está
      return codigo.length <= 36 ? codigo : codigo.substring(0, 36);
    });

    console.log('📋 Códigos procesados para MIR:', codigosProcesados);

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

    console.log('📋 Configuración MIR oficial para consulta:', {
      baseUrl: config.baseUrl,
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      simulacion: config.simulacion
    });

    // Crear cliente MIR oficial
    const client = new MinisterioClientOfficial(config);
    
    // Consultar comunicaciones con códigos procesados
    const resultado = await client.consultaComunicacion({ codigos: codigosProcesados });
    
    console.log('✅ Resultado de la consulta oficial:', resultado);

    return NextResponse.json({
      success: true,
      message: 'Consulta oficial completada',
      resultado: {
        exito: resultado.ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion,
        comunicaciones: resultado.comunicaciones
      },
      interpretacion: {
        exito: resultado.ok,
        mensaje: resultado.ok ? 
          `✅ Consulta realizada correctamente. Encontradas ${resultado.comunicaciones.length} comunicaciones` : 
          `❌ Error en la consulta: ${resultado.descripcion}`,
        codigo: resultado.codigo,
        totalComunicaciones: resultado.comunicaciones.length
      },
      comunicaciones: resultado.comunicaciones.map(com => ({
        codigo: com.codigo,
        tipo: com.tipo,
        estado: com.estado,
        fechaAlta: com.fechaAlta,
        referencia: com.referencia,
        interpretacion: {
          tipoDescripcion: getTipoDescripcion(com.tipo),
          estadoDescripcion: getEstadoDescripcion(com.estado)
        }
      })),
      debug: {
        codigosConsultados: codigos,
        config: {
          baseUrl: config.baseUrl,
          username: config.username,
          codigoArrendador: config.codigoArrendador,
          simulacion: config.simulacion
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en consulta oficial:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en consulta oficial',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function getTipoDescripcion(tipo: string): string {
  const tipos: Record<string, string> = {
    'RH': 'Reserva de Hospedaje',
    'AV': 'Alta de Viajero',
    'PV': 'Parte de Viajero',
    'RV': 'Reserva de Vehículo'
  };
  return tipos[tipo] || `Tipo desconocido: ${tipo}`;
}

function getEstadoDescripcion(estado: string): string {
  const estados: Record<string, string> = {
    'ACTIVA': 'Comunicación activa',
    'ANULADA': 'Comunicación anulada',
    'PENDIENTE': 'Comunicación pendiente',
    'PROCESADA': 'Comunicación procesada'
  };
  return estados[estado] || `Estado desconocido: ${estado}`;
}

