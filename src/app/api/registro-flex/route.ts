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

// Mapeadores flexibles
const mapPagoIn = (x?: string) => {
  const k = String(x || '').toLowerCase();
  if (k.includes('efect')) return 'EFECTIVO';
  if (k.includes('tarj')) return 'TARJETA';
  if (k.includes('trans')) return 'TRANSFERENCIA';
  if (k.includes('plat')) return 'PLATAFORMA';
  if (k.includes('movil')) return 'MOVIL';
  if (k.includes('cheq') || k.includes('treg')) return 'CHEQUE';
  if (k.includes('dest')) return 'DESTINO';
  return x || 'OTRO';
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
  if (k.includes('pas')) return 'PASSPORT';
  return 'OTHER';
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
      cp: String(viajero.cp || '').padStart(5, '0'),
      ine: String(viajero.ine || '').padStart(5, '0'),
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

    const normalized = normalize(json);
    if (!normalized) {
      return sendError(req, 400, 'JSON inválido o no parseable');
    }

    console.log('✅ Datos normalizados:', JSON.stringify(normalized, null, 2));

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
        if (!v.nombre) issues.push({ path: `${prefix}.nombre`, message: 'Requerido' });
        if (!v.primerApellido) issues.push({ path: `${prefix}.primerApellido`, message: 'Requerido' });
        if (!v.fechaNacimiento) issues.push({ path: `${prefix}.fechaNacimiento`, message: 'Requerido (YYYY-MM-DD)' });
        if (!v.tipoDocumento) issues.push({ path: `${prefix}.tipoDocumento`, message: 'Requerido' });
        if (!v.numeroDocumento) issues.push({ path: `${prefix}.numeroDocumento`, message: 'Requerido' });
        if (!v.direccion) issues.push({ path: `${prefix}.direccion`, message: 'Requerido' });
        if (!v.cp || !/^\d{5}$/.test(v.cp)) issues.push({ path: `${prefix}.cp`, message: 'Debe ser 5 dígitos' });
        if (!v.ine || !/^\d{5}$/.test(v.ine)) issues.push({ path: `${prefix}.ine`, message: 'Debe ser 5 dígitos' });
      });
    }

    if (issues.length) {
      console.error('❌ Errores de validación:', issues);
      return sendError(req, 422, 'Validación fallida', issues);
    }

    // Convertir al formato esperado por la base de datos
    const ESTABLISHMENT_CODE = "0000256653";
    const ESTABLISHMENT_REFERENCE = "0000146967";
    
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
        codigoMunicipio: v.ine
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
