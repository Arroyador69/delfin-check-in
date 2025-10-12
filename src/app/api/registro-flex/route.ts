import { NextRequest, NextResponse } from 'next/server';
import { insertGuestRegistration } from '@/lib/db';

// ===== ADAPTADOR FLEXIBLE CON ERRORES DETALLADOS =====

const cors = (req: NextRequest) => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://form.delfincheckin.com',
    'https://admin.delfincheckin.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];
  
  const isAllowed = allowedOrigins.includes(origin) || 
                   origin.startsWith('http://localhost:') || 
                   origin.startsWith('http://127.0.0.1:');
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://form.delfincheckin.com',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Dry-Run',
    'Access-Control-Max-Age': '86400'
  };
};

const sendError = (req: NextRequest, status: number, message: string, issues?: any[]) => {
  const headers = cors(req);
  return NextResponse.json({
    code: 'VALIDATION_ERROR',
    message,
    issues: Array.isArray(issues) ? issues : undefined
  }, { 
    status,
    headers
  });
};

// Mapeadores flexibles - Usar códigos oficiales del Ministerio del Interior
const mapPagoIn = (x?: string) => {
  const k = String(x || '').toLowerCase();
  if (k.includes('efect')) return 'EFECT';  // Efectivo
  if (k.includes('tarj')) return 'TARJT';   // Tarjeta
  if (k.includes('trans')) return 'TRANS';  // Transferencia
  if (k.includes('plat')) return 'PLATF';   // Plataforma
  if (k.includes('movil')) return 'MOVIL';  // Móvil
  if (k.includes('cheq') || k.includes('treg')) return 'TREG';  // Cheque
  if (k.includes('dest')) return 'DESTI';   // Destino
  return 'OTRO';  // Otro
};

const mapSexoIn = (x?: string) => {
  const k = String(x || '').toUpperCase();
  if (['M', 'HOMBRE', 'H'].includes(k)) return 'M';
  if (['F', 'MUJER'].includes(k)) return 'F';
  return 'X';
};

const mapDocTypeIn = (x?: string) => {
  const k = String(x || '').toLowerCase();
  if (k.includes('dni') || k.includes('nif')) return 'NIF';
  if (k.includes('nie')) return 'NIE';
  if (k.includes('pas')) return 'PAS'; // Corregido: máximo 5 caracteres según especificación MIR
  return 'OTRO'; // Corregido: máximo 5 caracteres según especificación MIR
};

const iso3to2 = (x?: string) => {
  const t = String(x || '').toUpperCase();
  const map: Record<string, string> = { 
    ESP: 'ES', FRA: 'FR', GBR: 'GB', ITA: 'IT', DEU: 'DE',
    PRT: 'PT', NLD: 'NL', BEL: 'BE', CHE: 'CH', AUT: 'AT'
  };
  return t.length === 2 ? t : (map[t] || t);
};

// Normalizador de fechas
const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // Si ya está en formato ISO, devolverlo
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Si está en formato DD/MM/AAAA, convertir a AAAA-MM-DD
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si está en formato AAAA-MM-DDThh:mm:ss, extraer solo la fecha
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    return dateStr.split('T')[0];
  }
  
  return dateStr;
};

const normalizeDateTime = (dateTimeStr: string): string => {
  if (!dateTimeStr) return '';
  
  // Si ya está en formato ISO, devolverlo
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateTimeStr)) {
    return dateTimeStr;
  }
  
  // Si está en formato DD/MM/AAAA, HH:mm:ss, convertir
  if (dateTimeStr.includes(',')) {
    const [datePart, timePart] = dateTimeStr.split(',');
    const normalizedDate = normalizeDate(datePart.trim());
    const time = timePart ? timePart.trim() : '00:00:00';
    return `${normalizedDate}T${time}`;
  }
  
  return dateTimeStr;
};

const normalize = (body: any) => {
  try {
    const b = typeof body === 'string' ? JSON.parse(body) : body;
    
    // Acepta tanto el formato nuevo como el antiguo
    const contrato = b?.contrato || {};
    const viajeros = b?.viajeros || [];
    
    // Normalizar contrato
    const contratoNormalizado = {
      fechaContrato: normalizeDate(contrato.fechaContrato),
      entrada: normalizeDateTime(contrato.entrada),
      salida: normalizeDateTime(contrato.salida),
      nHabitaciones: Number(contrato.nHabitaciones || 1),
      internet: !!contrato.internet,
      fechaPago: contrato.fechaPago ? normalizeDate(contrato.fechaPago) : null,
      tipoPago: mapPagoIn(contrato.tipoPagoCode || contrato.tipoPagoLabel || contrato.tipoPago),
      medioPago: contrato.medioPago || null,
    };
    
    // Función para normalizar un viajero
    const normalizeViajero = (viajero: any) => ({
      nombre: String(viajero.nombre || '').trim(),
      primerApellido: String(viajero.primerApellido || '').trim(),
      segundoApellido: String(viajero.segundoApellido || '').trim() || null,
      fechaNacimiento: normalizeDate(viajero.fechaNacimiento),
      tipoDocumento: mapDocTypeIn(viajero.tipoDocumento),
      numeroDocumento: String(viajero.numeroDocumento || '').toUpperCase().replace(/\s+/g, ''),
      sexo: mapSexoIn(viajero.sexo),
      nacionalidadISO2: iso3to2(viajero.nacionalidadISO2 || viajero.nacionalidad || viajero.nacionalidadISO3),
      telefono: String(viajero.telefono || '').replace(/\s+/g, ''),
      email: String(viajero.email || '').trim().toLowerCase(),
      direccion: String(viajero.direccion || '').trim(),
      cp: (() => {
        const cpValue = String(viajero.cp || '').trim();
        const pais = iso3to2(viajero.paisResidencia || viajero.pais || 'ES');
        // Solo aplicar padding para España
        return pais === 'ES' ? cpValue.padStart(5, '0') : cpValue;
      })(),
      ine: (() => {
        const ineValue = String(viajero.ine || '').trim();
        return ineValue ? ineValue.padStart(5, '0') : '';
      })(),
      nombreMunicipio: String(viajero.nombreMunicipio || '').trim(),
      paisResidencia: iso3to2(viajero.paisResidencia || viajero.pais || 'ES'),
    });
    
    // Normalizar todos los viajeros
    const viajerosNormalizados = viajeros.length > 0 
      ? viajeros.map(normalizeViajero).filter((v: any) => v.nombre) // Solo viajeros con nombre
      : [normalizeViajero({})]; // Al menos un viajero vacío si no hay ninguno
    
    return {
      contrato: contratoNormalizado,
      viajeros: viajerosNormalizados,
      titular: b?.titular || {}
    };
  } catch (e: any) {
    console.error('Error normalizando payload:', e);
    return null;
  }
};

// Manejar preflight OPTIONS
export async function OPTIONS(req: NextRequest) {
  const headers = cors(req);
  return new NextResponse(null, { 
    status: 200, 
    headers 
  });
}

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Endpoint flexible recibiendo registro...');
    
    // Verificar si es un test de conectividad (dry-run)
    const isDryRun = req.headers.get('X-Dry-Run') === '1';
    if (isDryRun) {
      console.log('🔍 Test de conectividad detectado');
      const headers = cors(req);
      return NextResponse.json({ 
        status: 'ok',
        message: 'Endpoint funcionando correctamente',
        timestamp: new Date().toISOString(),
        source: 'registro-flex-endpoint'
      }, {
        status: 200,
        headers
      });
    }
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      console.error('❌ Datos JSON inválidos o vacíos');
      return sendError(req, 400, 'Datos JSON inválidos o vacíos');
    }

    console.log('📋 Datos recibidos:', JSON.stringify(json, null, 2));
    
    // 🔬 DEBUG: Análisis detallado de los datos
    console.log('🔬 DEBUG INICIAL - Estructura completa:', {
      tieneContrato: !!json.contrato,
      tieneTitular: !!json.titular,
      tieneViajeros: !!json.viajeros,
      numeroViajeros: json.viajeros?.length || 0,
      viajeros: json.viajeros?.map((v: any, i: number) => ({
        index: i,
        nombre: v.nombre,
        paisResidencia: v.paisResidencia,
        ine: v.ine,
        nombreMunicipio: v.nombreMunicipio,
        todosLosCampos: Object.keys(v)
      }))
    });

    const normalized = normalize(json);
    if (!normalized) {
      return sendError(req, 400, 'JSON inválido o no parseable');
    }

    console.log('✅ Datos normalizados:', JSON.stringify(normalized, null, 2));
    
    // Debug específico para datos de dirección
    if (normalized.viajeros && normalized.viajeros.length > 0) {
      console.log('🔍 Debug - Datos de dirección en viajeros:');
      normalized.viajeros.forEach((viajero, index) => {
        console.log(`  Viajero ${index + 1}:`, {
          nombre: viajero.nombre,
          direccion: viajero.direccion,
          cp: viajero.cp,
          ine: viajero.ine,
          paisResidencia: viajero.paisResidencia
        });
      });
    }

    // Validaciones mínimas con mensajes claros
    const issues: any[] = [];
    const c = normalized.contrato || {};
    const viajeros = normalized.viajeros || [];

    // Validar contrato
    if (!c.fechaContrato) issues.push({ path: 'contrato.fechaContrato', message: 'Requerido (YYYY-MM-DD)' });
    if (!c.entrada) issues.push({ path: 'contrato.entrada', message: 'Requerido (YYYY-MM-DDTHH:mm:ss)' });
    if (!c.salida) issues.push({ path: 'contrato.salida', message: 'Requerido (YYYY-MM-DDTHH:mm:ss)' });
    if (c.entrada && c.salida && new Date(c.entrada) > new Date(c.salida)) {
      issues.push({ path: 'contrato.entrada', message: 'Entrada no puede ser posterior a Salida' });
    }
    if (!c.tipoPago) issues.push({ path: 'contrato.tipoPago', message: 'Requerido' });

    // Validar que haya al menos un viajero
    if (!viajeros.length) {
      issues.push({ path: 'viajeros', message: 'Se requiere al menos un viajero' });
    } else {
    // Validar cada viajero
    viajeros.forEach((v: any, index: number) => {
      const prefix = `viajeros[${index}]`;
      
      // 🔬 DEBUG: Log datos del viajero
      console.log(`🔬 DEBUG VALIDACIÓN - Viajero ${index + 1}:`, JSON.stringify(v, null, 2));
      console.log(`🔬 DEBUG VALIDACIÓN - Campo 'ine':`, `"${v.ine}"`, `(tipo: ${typeof v.ine})`);
      console.log(`🔬 DEBUG VALIDACIÓN - Campo 'paisResidencia':`, `"${v.paisResidencia}"`);
      console.log(`🔬 DEBUG VALIDACIÓN - Campo 'nombreMunicipio':`, `"${v.nombreMunicipio}"`);
      
      if (!v.nombre) issues.push({ path: `${prefix}.nombre`, message: 'Requerido' });
      if (!v.primerApellido) issues.push({ path: `${prefix}.primerApellido`, message: 'Requerido' });
      if (!v.fechaNacimiento) issues.push({ path: `${prefix}.fechaNacimiento`, message: 'Requerido (YYYY-MM-DD)' });
      if (!v.tipoDocumento) issues.push({ path: `${prefix}.tipoDocumento`, message: 'Requerido' });
      if (!v.numeroDocumento) issues.push({ path: `${prefix}.numeroDocumento`, message: 'Requerido' });
      if (!v.direccion) issues.push({ path: `${prefix}.direccion`, message: 'Requerido' });
      
      // Validación flexible de código postal según el país
      if (!v.cp) {
        issues.push({ path: `${prefix}.cp`, message: 'Requerido' });
      } else {
        const esEspana = v.paisResidencia === 'ES';
        if (esEspana && !/^\d{5}$/.test(v.cp)) {
          issues.push({ path: `${prefix}.cp`, message: 'Para España debe ser 5 dígitos' });
        }
        // Para otros países, solo verificar que no esté vacío
      }
      
      // Validación condicional de INE: solo para españoles
      const esEspana = v.paisResidencia === 'ES';
      console.log(`🔬 DEBUG VALIDACIÓN - Es España:`, esEspana);
      
      if (esEspana) {
        if (!v.ine || !/^\d{5}$/.test(v.ine)) {
          issues.push({ path: `${prefix}.ine`, message: 'Para españoles: debe ser 5 dígitos' });
        }
      } else {
        // Para extranjeros, INE debe estar vacío y nombreMunicipio es requerido
        console.log(`🔬 DEBUG VALIDACIÓN - Verificando INE para extranjero:`, `"${v.ine}"`, `(vacío: ${!v.ine || v.ine.trim() === ''})`);
        if (v.ine && v.ine.trim() !== '') {
          console.log(`❌ ERROR: INE no está vacío para extranjero:`, `"${v.ine}"`);
          issues.push({ path: `${prefix}.ine`, message: 'Para extranjeros: debe estar vacío' });
        }
        if (!v.nombreMunicipio || v.nombreMunicipio.trim() === '') {
          issues.push({ path: `${prefix}.nombreMunicipio`, message: 'Para extranjeros: requerido' });
        }
      }
    });
    }

    if (issues.length) {
      console.error('❌ Errores de validación:', issues);
      return sendError(req, 422, 'Validación fallida', issues);
    }

    // Obtener configuración MIR del tenant (si está autenticado)
    // Si no hay tenant_id, usar valores por defecto (formulario público)
    const tenantId = req.headers.get('x-tenant-id');
    let ESTABLISHMENT_CODE = "0000256653"; // Valor por defecto
    let ESTABLISHMENT_REFERENCE = "0000146967"; // Valor por defecto
    let ESTABLISHMENT_NAME = "Delfín Check-in"; // Valor por defecto
    let ESTABLISHMENT_ADDRESS = "Fuengirola, Málaga, España"; // Valor por defecto
    
    if (tenantId) {
      try {
        const { sql: pgSql } = await import('@vercel/postgres');
        const tenantResult = await pgSql`
          SELECT config FROM tenants WHERE id = ${tenantId}
        `;
        
        if (tenantResult.rows.length > 0) {
          const config = tenantResult.rows[0].config || {};
          const mirConfig = config.mir || {};
          
          if (mirConfig.enabled && mirConfig.codigoEstablecimiento) {
            ESTABLISHMENT_CODE = mirConfig.codigoEstablecimiento;
            ESTABLISHMENT_NAME = mirConfig.denominacion || ESTABLISHMENT_NAME;
            ESTABLISHMENT_ADDRESS = mirConfig.direccionCompleta || ESTABLISHMENT_ADDRESS;
            console.log(`✅ Usando configuración MIR del tenant ${tenantId}`);
          }
        }
      } catch (error) {
        console.log('⚠️ No se pudo cargar configuración MIR del tenant, usando valores por defecto');
      }
    }
    
    // Convertir al formato esperado por la base de datos
    
    // Convertir viajeros al formato de base de datos
    const personasDB = viajeros.map((v: any) => ({
      rol: 'VI',
      nombre: v.nombre,
      apellido1: v.primerApellido,
      apellido2: v.segundoApellido,
      tipoDocumento: v.tipoDocumento,
      numeroDocumento: v.numeroDocumento,
      fechaNacimiento: v.fechaNacimiento,
      nacionalidad: v.nacionalidadISO2,
      sexo: v.sexo,
      telefono: v.telefono,
      telefono2: '', // Campo adicional vacío
      correo: v.email,
      direccion: {
        direccion: v.direccion,
        codigoPostal: v.cp,
        pais: v.paisResidencia,
        codigoMunicipio: v.ine,
        nombreMunicipio: v.nombreMunicipio || '' // Añadir campo nombreMunicipio
      }
    }));
    
    const dbData = {
      codigoEstablecimiento: ESTABLISHMENT_CODE,
      comunicaciones: [{
        contrato: {
          referencia: ESTABLISHMENT_REFERENCE,
          fechaContrato: c.fechaContrato,
          fechaEntrada: c.entrada,
          fechaSalida: c.salida,
          numPersonas: viajeros.length,
          numHabitaciones: c.nHabitaciones,
          internet: c.internet,
          pago: {
            tipoPago: c.tipoPago,
            fechaPago: c.fechaPago,
            medioPago: c.medioPago,
            titular: normalized.titular?.nombreCompleto,
            caducidadTarjeta: normalized.titular?.tarjetaCaducidad
          }
        },
        personas: personasDB
      }]
    };

    console.log('💾 Guardando en base de datos...');
    console.log('🔍 Debug - Datos finales que se van a guardar:', JSON.stringify(dbData, null, 2));
    
    // Guardar en base de datos
    const id = await insertGuestRegistration({
      reserva_ref: ESTABLISHMENT_REFERENCE,
      fecha_entrada: c.entrada.split('T')[0],
      fecha_salida: c.salida.split('T')[0],
      data: dbData
    });

    console.log('✅ Registro guardado con ID:', id);

    const headers = cors(req);
    return NextResponse.json({ 
      success: true, 
      message: 'Registro guardado correctamente',
      id: id,
      reserva_ref: ESTABLISHMENT_REFERENCE,
      date: new Date().toISOString().split('T')[0]
    }, {
      status: 201,
      headers
    });

  } catch (error) {
    console.error('💥 Error interno del servidor:', error);
    
    const headers = cors(req);
    return NextResponse.json({ 
      code: 'INTERNAL_ERROR',
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 500,
      headers
    });
  }
}
