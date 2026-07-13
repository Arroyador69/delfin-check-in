import { NextRequest, NextResponse } from 'next/server';
import { insertGuestRegistration } from '@/lib/db';
import { validateMirSoporteDocumento } from '@/lib/mir-soporte-documento';
import { MIR_MAX_PERSONAS_PER_COMUNICACION } from '@/lib/form-max-guests';

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
  if (['M', 'HOMBRE', 'H'].includes(k)) return 'H'; // MIR: H=Hombre
  if (['F', 'MUJER'].includes(k)) return 'M'; // MIR: M=Mujer
  return 'O'; // MIR: O=Otro (valor por defecto válido)
};

const mapDocTypeIn = (x?: string) => {
  const k = String(x || '').toLowerCase();
  if (k.includes('dni') || k.includes('nif')) return 'NIF';
  if (k.includes('nie')) return 'NIE';
  if (k.includes('pas')) return 'PAS'; // Corregido: máximo 5 caracteres según especificación MIR
  return 'OTRO'; // Corregido: máximo 5 caracteres según especificación MIR
};

// Función para mantener códigos ISO 3166-1 Alfa-3 (MIR requiere Alfa-3)
const normalizeToAlpha3 = (x?: string) => {
  const t = String(x || '').toUpperCase();
  const map: Record<string, string> = { 
    'ES': 'ESP', 'FR': 'FRA', 'GB': 'GBR', 'IT': 'ITA', 'DE': 'DEU',
    'PT': 'PRT', 'NL': 'NLD', 'BE': 'BEL', 'CH': 'CHE', 'AT': 'AUT',
    'SPAIN': 'ESP', 'FRANCE': 'FRA', 'UNITED KINGDOM': 'GBR', 'ITALY': 'ITA', 'GERMANY': 'DEU',
    'PORTUGAL': 'PRT', 'NETHERLANDS': 'NLD', 'BELGIUM': 'BEL', 'SWITZERLAND': 'CHE', 'AUSTRIA': 'AUT'
  };
  return t.length === 3 ? t : (map[t] || t);
};

// Función legacy para compatibilidad (mantiene Alfa-2 para validaciones locales)
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
    
    // Acepta tanto el formato nuevo (contrato/viajeros) como el formato "parte" (ejecucionContrato/pago/viajeros.documento)
    const contrato = b?.contrato || {};
    const viajeros = b?.viajeros || [];
    
    // Normalizar contrato
  const contratoNormalizado = {
      // Permitir fechaContrato a nivel raíz (formato antiguo "parte")
      fechaContrato: normalizeDate(contrato.fechaContrato || b?.fechaContrato),
      // Permitir leer de ejecucionContrato si faltan
      entrada: normalizeDateTime(contrato.entrada || b?.ejecucionContrato?.fechaHoraEntrada),
      salida: normalizeDateTime(contrato.salida || b?.ejecucionContrato?.fechaHoraSalida),
      nHabitaciones: Number(contrato.nHabitaciones || b?.numHabitaciones || 1),
      internet: !!(contrato?.internet ?? b?.internet ?? contrato.internet),
      fechaPago: (contrato.fechaPago || b?.pago?.fechaPago) ? normalizeDate(contrato.fechaPago || b?.pago?.fechaPago) : null,
      tipoPago: mapPagoIn(contrato.tipoPagoCode || contrato.tipoPagoLabel || contrato.tipoPago || b?.pago?.tipo),
      medioPago: contrato.medioPago || b?.pago?.identificacion || null,
  } as any;

  // Fallback robusto: si falta fechaContrato, derivarla de la entrada (solo fecha)
  if (!contratoNormalizado.fechaContrato && contratoNormalizado.entrada) {
    try {
      contratoNormalizado.fechaContrato = String(contratoNormalizado.entrada).split('T')[0];
    } catch {}
  }
    
    // Función para normalizar un viajero
    const normalizeViajero = (viajero: any) => {
      // Soportar formato antiguo { documento:{tipo,numero}, residencia:{direccion,localidad,pais} }
      const doc = viajero.documento || {};
      const res = viajero.residencia || {};
      const paisEntrada = viajero.paisResidencia || viajero.pais || res.pais;
      const cpEntrada = viajero.cp || viajero.codigoPostal || res.codigoPostal;
      // Aceptar múltiples alias de INE y normalizar a 5 dígitos
      const ineEntradaRaw =
        viajero.ine ||
        viajero.codigoMunicipio ||
        viajero.codigoMunicipioINE ||
        viajero.municipioINE ||
        res.codigoMunicipio ||
        res.codigoMunicipioINE ||
        res.municipioINE;

      return {
        nombre: String(viajero.nombre || '').trim(),
        primerApellido: String(viajero.primerApellido || '').trim(),
        segundoApellido: String(viajero.segundoApellido || '').trim() || null,
        fechaNacimiento: normalizeDate(viajero.fechaNacimiento),
        tipoDocumento: mapDocTypeIn(viajero.tipoDocumento || doc.tipo),
        numeroDocumento: String(viajero.numeroDocumento || doc.numero || '').toUpperCase().replace(/\s+/g, ''),
        soporteDocumento: String(viajero.soporteDocumento || doc.soporte || '').trim().toUpperCase() || undefined,
        sexo: mapSexoIn(viajero.sexo),
        nacionalidad: viajero.nacionalidad || viajero.nacionalidadISO3, // Ya viene en ISO3 desde el frontend
        nacionalidadISO2: iso3to2(viajero.nacionalidad || viajero.nacionalidadISO3), // Convertir ISO3 a ISO2 para compatibilidad
        telefono: String(viajero.telefono || '').replace(/\s+/g, ''),
        correo: String(viajero.correo || viajero.email || '').trim().toLowerCase(),
        direccion: String(viajero.direccion || res.direccion || '').trim(),
        cp: (() => {
          const cpValue = String(cpEntrada || '').trim();
          const pais = iso3to2(paisEntrada || 'ESP');
          return pais === 'ES' ? cpValue.padStart(5, '0') : cpValue;
        })(),
        ine: (() => {
          const digits = String(ineEntradaRaw || '').replace(/\D/g, '');
          return digits ? digits.padStart(5, '0').slice(-5) : '';
        })(),
        nombreMunicipio: String(viajero.nombreMunicipio || res.localidad || '').trim(),
        paisResidencia: normalizeToAlpha3(paisEntrada || 'ESP'),
      };
    };
    
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
    const roomIdFromQuery = req.nextUrl.searchParams.get('room_id')?.trim() || '';
    const roomIdFromHeader = (req.headers.get('x-room-id') || req.headers.get('X-Room-Id') || '').trim();
    
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
    const room_id = (json?.room_id ? String(json.room_id).trim() : '') || roomIdFromQuery || roomIdFromHeader || '';

    console.log('📋 Datos recibidos:', JSON.stringify(json, null, 2));
    
    // 🔬 DEBUG: Análisis detallado de los datos
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔬 DEBUG INICIAL - PAYLOAD RECIBIDO:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📦 Estructura completa:', {
      tieneContrato: !!json.contrato,
      tieneTitular: !!json.titular,
      tieneViajeros: !!json.viajeros,
      tieneEjecucionContrato: !!json.ejecucionContrato,
      tienePago: !!json.pago,
      numeroViajeros: json.viajeros?.length || 0,
    });
    
    console.log('👥 Análisis de viajeros ANTES de normalizar:');
    json.viajeros?.forEach((v: any, i: number) => {
      console.log(`  Viajero ${i}:`, {
        nombre: v.nombre,
        paisResidencia: v.paisResidencia,
        pais: v.pais,
        'residencia.pais': v.residencia?.pais,
        ine: v.ine,
        codigoMunicipio: v.codigoMunicipio,
        'residencia.codigoMunicipio': v.residencia?.codigoMunicipio,
        nombreMunicipio: v.nombreMunicipio,
        'residencia.localidad': v.residencia?.localidad,
        todosLosCampos: Object.keys(v)
      });
    });
    console.log('═══════════════════════════════════════════════════════════');

    const normalized = normalize(json);
    if (!normalized) {
      return sendError(req, 400, 'JSON inválido o no parseable');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ DATOS NORMALIZADOS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(JSON.stringify(normalized, null, 2));
    
    console.log('👥 Análisis de viajeros DESPUÉS de normalizar:');
    normalized.viajeros?.forEach((v: any, i: number) => {
      console.log(`  Viajero ${i}:`, {
        nombre: v.nombre,
        paisResidencia: v.paisResidencia,
        ine: `"${v.ine}"`,
        ineLength: v.ine?.length,
        ineEsValido: /^\d{5}$/.test(v.ine || ''),
        nombreMunicipio: v.nombreMunicipio,
        cp: v.cp
      });
    });
    console.log('═══════════════════════════════════════════════════════════');
    
    // Debug específico para datos de dirección
    if (normalized.viajeros && normalized.viajeros.length > 0) {
      console.log('🔍 Debug - Datos de dirección en viajeros:');
      normalized.viajeros.forEach((viajero: any, index: number) => {
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
    } else if (viajeros.length > MIR_MAX_PERSONAS_PER_COMUNICACION) {
      issues.push({
        path: 'viajeros',
        message: `Máximo ${MIR_MAX_PERSONAS_PER_COMUNICACION} viajeros por comunicación MIR`,
      });
    } else {
    // Validar cada viajero
    viajeros.forEach((v: any, index: number) => {
      const prefix = `viajeros[${index}]`;
      
      // 🔬 DEBUG: Log datos del viajero
      console.log(`🔬 DEBUG VALIDACIÓN - Viajero ${index + 1}:`, JSON.stringify(v, null, 2));
      console.log(`🔬 DEBUG VALIDACIÓN - Campo 'ine':`, `"${v.ine}"`, `(tipo: ${typeof v.ine})`);
      console.log(`🔬 DEBUG VALIDACIÓN - Campo 'paisResidencia':`, `"${v.paisResidencia}"`);
      console.log(`🔬 DEBUG VALIDACIÓN - Campo 'nombreMunicipio':`, `"${v.nombreMunicipio}"`);
      
      // Validaciones obligatorias para todos los viajeros
      if (!v.nombre) issues.push({ path: `${prefix}.nombre`, message: 'Requerido' });
      if (!v.primerApellido) issues.push({ path: `${prefix}.primerApellido`, message: 'Requerido' });
      if (!v.fechaNacimiento) issues.push({ path: `${prefix}.fechaNacimiento`, message: 'Requerido (YYYY-MM-DD)' });
      if (!v.tipoDocumento) issues.push({ path: `${prefix}.tipoDocumento`, message: 'Requerido' });
      if (!v.numeroDocumento) issues.push({ path: `${prefix}.numeroDocumento`, message: 'Requerido' });
      const soporteErr = validateMirSoporteDocumento(v.tipoDocumento, v.soporteDocumento, v.numeroDocumento);
      if (soporteErr) {
        issues.push({
          path: `${prefix}.soporteDocumento`,
          message: soporteErr,
        });
      }
      if (!v.direccion) issues.push({ path: `${prefix}.direccion`, message: 'Requerido' });
      if (!v.nacionalidad) issues.push({ path: `${prefix}.nacionalidad`, message: 'Requerido' });
      if (!v.sexo) issues.push({ path: `${prefix}.sexo`, message: 'Requerido' });
      
      // Teléfono y email obligatorios solo para el primer viajero
      if (index === 0) {
        if (!v.telefono) issues.push({ path: `${prefix}.telefono`, message: 'Teléfono requerido para el primer viajero' });
        if (!v.correo) {
          issues.push({ path: `${prefix}.correo`, message: 'Email requerido para el primer viajero' });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo)) {
          issues.push({ path: `${prefix}.correo`, message: 'Email no válido' });
        }
      }
      
      // Segundo apellido obligatorio solo para españoles
      const esEspana = v.nacionalidad === 'ESP';
      if (esEspana && !v.segundoApellido) {
        issues.push({ path: `${prefix}.segundoApellido`, message: 'Segundo apellido requerido para españoles' });
      }
      
      // Validación flexible de código postal según el país
      if (!v.cp) {
        issues.push({ path: `${prefix}.cp`, message: 'Requerido' });
      } else {
        const esEspana = v.paisResidencia === 'ESP';
        if (esEspana && !/^\d{5}$/.test(v.cp)) {
          issues.push({ path: `${prefix}.cp`, message: 'Para España debe ser 5 dígitos' });
        }
        // Para otros países, solo verificar que no esté vacío
      }
      
      // Validación condicional de INE: solo para españoles
      const esEspanaResidencia = v.paisResidencia === 'ESP';
      // Convertir país de residencia a ISO2 para debugging legible y evitar referencias no definidas
      const paisISO2 = iso3to2(v.paisResidencia || 'ESP');
      console.log(`🔬 DEBUG VALIDACIÓN - Viajero ${index}:`, {
        esEspanaResidencia,
        paisResidencia: v.paisResidencia,
        paisISO2,
        ine: `"${v.ine}"`,
        ineLength: v.ine?.length,
        ineValido: /^\d{5}$/.test(v.ine || ''),
        nombreMunicipio: `"${v.nombreMunicipio}"`
      });
      
      if (esEspanaResidencia) {
        if (!v.ine || !/^\d{5}$/.test(v.ine)) {
          console.warn(`⚠️ AVISO VALIDACIÓN - Viajero ${index}: INE ausente o inválido para español. Se permite guardar y revisar más tarde.`, {
            ine: v.ine,
            esperado: '5 dígitos numéricos',
            recibido: `"${v.ine}" (${v.ine?.length || 0} caracteres)`
          });
          // No bloqueamos el flujo. Se podrá corregir antes de envío al MIR.
        }
      } else {
        // Para extranjeros, INE debe estar vacío y nombreMunicipio es requerido
        console.log(`🔬 DEBUG VALIDACIÓN - Verificando campos para extranjero:`, {
          ine: `"${v.ine}"`, 
          ineVacio: !v.ine || v.ine.trim() === '',
          nombreMunicipio: `"${v.nombreMunicipio}"`,
          nombreMunicipioVacio: !v.nombreMunicipio || v.nombreMunicipio.trim() === ''
        });
        
        if (v.ine && v.ine.trim() !== '') {
          console.error(`❌ ERROR VALIDACIÓN - Viajero ${index}: INE debe estar vacío para extranjero:`, `"${v.ine}"`);
          issues.push({ 
            path: `${prefix}.ine`, 
            message: `Para extranjeros el campo INE debe estar vacío. Recibido: "${v.ine}". Solo rellena el campo "Nombre del municipio".` 
          });
        }
        if (!v.nombreMunicipio || v.nombreMunicipio.trim() === '') {
          console.error(`❌ ERROR VALIDACIÓN - Viajero ${index}: Falta nombre del municipio para extranjero`);
          issues.push({ 
            path: `${prefix}.nombreMunicipio`, 
            message: 'Para extranjeros es OBLIGATORIO el nombre del municipio/ciudad donde resides' 
          });
        }
      }
    });
    }

    if (issues.length) {
      console.error('═══════════════════════════════════════════════════════════');
      console.error('❌ ERRORES DE VALIDACIÓN:');
      console.error('═══════════════════════════════════════════════════════════');
      issues.forEach((issue, idx) => {
        console.error(`  Error ${idx + 1}: ${issue.path} - ${issue.message}`);
      });
      console.error('═══════════════════════════════════════════════════════════');
      console.error('💡 SOLUCIÓN:');
      console.error('   1. Si el viajero reside en España: Debe rellenar el campo "Código municipio INE" con 5 dígitos');
      console.error('   2. Si el viajero es extranjero: Debe dejar vacío el campo "Código INE" y rellenar "Nombre municipio"');
      console.error('   3. Busca en Google: "código INE + nombre de tu ciudad" para encontrar el código correcto');
      console.error('═══════════════════════════════════════════════════════════');
      return sendError(req, 422, 'Validación fallida', issues);
    }

    // ⚠️ CRÍTICO: Obtener tenant_id del header o parámetros
    // El endpoint /api/public/form/[slug]/submit pasa tenant_id en X-Tenant-ID
    const tenantId = req.headers.get('X-Tenant-ID') || 
                     req.headers.get('x-tenant-id') ||
                     json.tenant_id || 
                     json.tenantId ||
                     null;
    
    console.log('🏢 Tenant ID detectado:', tenantId);
    
    // Datos del establecimiento: NUNCA usar valores "globales" de plataforma.
    // Si el tenant no tiene configuración, dejamos vacío y el envío al MIR quedará pendiente/error.
    let ESTABLISHMENT_CODE = '';
    let ESTABLISHMENT_REFERENCE = '';

    // room_id y property_id (si vienen) sirven para asociar unidad y, opcionalmente, elegir credencial MIR.
    const propertyIdFromQuery = req.nextUrl.searchParams.get('property_id')?.trim() || '';
    const propertyIdFromBody = (json?.property_id ? String(json.property_id).trim() : '') || '';
    const property_id = propertyIdFromBody || propertyIdFromQuery || '';

    if (tenantId) {
      try {
        const { sql: pgSql } = await import('@vercel/postgres');

        // 1) Intentar MIR multi-credenciales por unidad (si existe mapping)
        try {
          const { ensureMirMultiSchema } = await import('@/lib/mir-multi');
          await ensureMirMultiSchema();
        } catch {
          // ignore
        }

        if (room_id) {
          const multi = await pgSql`
            SELECT c.codigo_establecimiento
            FROM mir_unidad_credencial_map m
            JOIN mir_credenciales c ON c.id = m.credencial_id
            WHERE m.tenant_id = ${tenantId}::uuid
              AND m.room_id = ${room_id}
              AND c.activo = true
            LIMIT 1
          `;
          if (multi.rows.length > 0) {
            ESTABLISHMENT_CODE = String(multi.rows[0].codigo_establecimiento || '').trim();
          }
        }

        // 2) Fallback a mir_configuraciones del tenant (activo)
        if (!ESTABLISHMENT_CODE) {
          const dbCfg = await pgSql`
            SELECT codigo_establecimiento
            FROM mir_configuraciones
            WHERE (propietario_id = ${tenantId} OR tenant_id = ${tenantId})
              AND activo = true
            ORDER BY updated_at DESC
            LIMIT 1
          `;
          if (dbCfg.rows.length > 0) {
            ESTABLISHMENT_CODE = String(dbCfg.rows[0].codigo_establecimiento || '').trim();
          }
        }
      } catch {
        // No bloquear: si no hay config, el envío MIR fallará y se verá en estado/envíos.
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
      nacionalidad: v.nacionalidad, // Ya viene en ISO3 desde el frontend
      sexo: v.sexo,
      telefono: v.telefono,
      telefono2: '', // Campo adicional vacío
      correo: v.correo, // Ya viene como 'correo' desde el frontend
      direccion: {
        direccion: v.direccion,
        codigoPostal: v.cp,
        pais: v.paisResidencia, // Ya viene en ISO3 desde el frontend
        codigoMunicipio: v.ine,
        nombreMunicipio: v.nombreMunicipio || '' // Añadir campo nombreMunicipio
      }
    }));
    
    const storedData = {
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

    // ⚠️ CRÍTICO: Generar referencia única ANTES de guardar
    // Esta referencia se usará para reserva_ref, comunicacion_id y el envío al MIR
    // Usar Web Crypto API compatible con Edge Runtime
    const reserva_ref = crypto.randomUUID ? crypto.randomUUID() : 
      Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5'); // Formato UUID v4
    
    console.log('🔖 Referencia única generada:', reserva_ref);
    
    // Actualizar dbData con la referencia única
    storedData.comunicaciones[0].contrato.referencia = reserva_ref;

    console.log('💾 Guardando en base de datos...');
    console.log('🔍 Debug - Datos finales que se van a guardar:', JSON.stringify(storedData, null, 2));
    
    const firmas = json.firmas && Array.isArray(json.firmas) ? json.firmas : (json.firma ? [json.firma] : null);
    const firmaFechas = json.firma_fechas && Array.isArray(json.firma_fechas) ? json.firma_fechas : (json.firma_fecha ? [json.firma_fecha] : null);
    const signature_data = firmas && firmas.length ? JSON.stringify(firmas) : null;
    const signature_date = firmaFechas && firmaFechas[0] ? firmaFechas[0] : json.firma_fecha || null;

    const id = await insertGuestRegistration({
      reserva_ref: reserva_ref,
      fecha_entrada: c.entrada.split('T')[0],
      fecha_salida: c.salida.split('T')[0],
      data: {
        ...storedData,
        ...(room_id ? { room_id } : {}),
        ...(property_id ? { property_id } : {}),
        ui_locale:
          req.headers.get('x-ui-locale') ||
          req.headers.get('X-UI-Locale') ||
          req.headers.get('accept-language')?.split(',')[0]?.trim() ||
          null,
        checkin_instructions_opt_in:
          (json as any)?.checkin_instructions_opt_in === true ||
          (json as any)?.checkin_instructions_opt_in === 'true' ||
          (json as any)?.receive_checkin_instructions === true ||
          (json as any)?.receive_checkin_instructions === 'true' ||
          (json as any)?.receiveInstructions === true ||
          (json as any)?.receiveInstructions === 'true' ||
          false,
      },
      tenant_id: tenantId,
      signature_data,
      signature_date,
    });

    console.log('✅ Registro guardado en guest_registrations con ID:', id);

    try {
      const { syncReservationFromGuestRegistration } = await import('@/lib/reservation-from-guest-registration');
      const syncRes = await syncReservationFromGuestRegistration({
        guestRegistrationId: id,
        tenantId,
        reservaRef: reserva_ref,
        fechaEntrada: c.entrada.split('T')[0],
        fechaSalida: c.salida.split('T')[0],
        data: {
          ...(storedData as Record<string, unknown>),
          ...(room_id ? ({ room_id } as any) : {}),
          ...(property_id ? ({ property_id } as any) : {}),
          ui_locale:
            req.headers.get('x-ui-locale') ||
            req.headers.get('X-UI-Locale') ||
            req.headers.get('accept-language')?.split(',')[0]?.trim() ||
            null,
        } as Record<string, unknown>,
      });
      console.log('📋 Reserva panel (desde formulario viajero):', syncRes);
    } catch (syncErr) {
      console.error('⚠️ syncReservationFromGuestRegistration:', syncErr);
    }
    console.log('🔍 Reserva Ref:', reserva_ref);
    console.log('🔍 Tenant ID:', tenantId);
    
    // Generar comunicacion_id con formato "guest-{id}-{timestamp}"
    const timestamp = Date.now();
    const comunicacion_id = `guest-${id}-${timestamp}`;
    
    // Actualizar comunicacion_id inmediatamente después de guardar
    try {
      const { sql: pgSql } = await import('@vercel/postgres');
      await pgSql`
        UPDATE guest_registrations 
        SET comunicacion_id = ${comunicacion_id}
        WHERE id = ${id}
      `;
      console.log('✅ Comunicacion ID actualizado:', comunicacion_id);
    } catch (updateError) {
      console.error('⚠️ Error actualizando comunicacion_id:', updateError);
    }

    // Enviar automáticamente al MIR (PV + RH dual)
    let dualResult: any = null;
    let dualError: any = null;
    let mirEstadoFinal: 'enviado' | 'pendiente' | 'error' = 'pendiente';
    try {
      console.log('📤 Enviando automáticamente al MIR (PV + RH dual)...');
      
      // Preparar datos para el envío dual
      const datosMIR = {
        referencia: reserva_ref,
        fechaEntrada: c.entrada.split('T')[0],
        fechaSalida: c.salida.split('T')[0],
        tipoPago: c.tipoPago,
        pago: {
          tipoPago: c.tipoPago,
          fechaPago: c.fechaPago || undefined,
          medioPago: c.medioPago || undefined,
        },
        ...(room_id ? { room_id } : {}),
        personas: personasDB.map((persona: any) => ({
          nombre: persona.nombre,
          apellido1: persona.apellido1,
          apellido2: persona.apellido2 || '',
          tipoDocumento: persona.tipoDocumento,
          numeroDocumento: persona.numeroDocumento,
          fechaNacimiento: persona.fechaNacimiento,
          nacionalidad: persona.nacionalidad,
          sexo: persona.sexo,
          contacto: {
            telefono: persona.telefono || '',
            correo: persona.correo || ''
          },
          direccion: {
            direccion: persona.direccion.direccion,
            codigoPostal: persona.direccion.codigoPostal,
            pais: persona.direccion.pais,
            codigoMunicipio: persona.direccion.codigoMunicipio || '',
            nombreMunicipio: persona.direccion.nombreMunicipio || ''
          }
        }))
      };
      
      // Enviar usando el endpoint dual (PV + RH en una sola llamada)
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📤 Enviando PV + RH al MIR usando endpoint dual...');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔍 URL del endpoint:', `${req.nextUrl.origin}/api/ministerio/auto-envio-dual`);
      console.log('🔍 Tenant ID:', tenantId);
      console.log('🔍 Tenant ID type:', typeof tenantId);
      console.log('🔍 Datos MIR keys:', Object.keys(datosMIR));
      console.log('🔍 Datos MIR:', JSON.stringify(datosMIR, null, 2));
      console.log('═══════════════════════════════════════════════════════════');
      
      try {
      // IMPORTANTE: evitar fetch HTTP hacia /api/ministerio/* desde serverless, porque el middleware
      // exige tenant_id vía JWT y puede bloquear llamadas server-to-server aunque pasemos headers.
      // Llamamos al handler directamente para mantener aislamiento y no abrir rutas públicas.
      const { POST: autoEnvioDualHandler } = await import('@/app/api/ministerio/auto-envio-dual/route');

      const internalReq = new NextRequest(req.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-tenant-id': tenantId || 'default',
          'X-Tenant-ID': tenantId || 'default',
          ...(room_id ? { 'X-Room-Id': room_id } : {}),
        },
        body: JSON.stringify({ ...datosMIR, tenantId, ...(room_id ? { room_id } : {}) }),
      });

      const dualResponse = await autoEnvioDualHandler(internalReq);
      
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📥 Respuesta del endpoint dual:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Status:', dualResponse.status);
        console.log('Status Text:', dualResponse.statusText);
        console.log('OK:', dualResponse.ok);
        console.log('Headers:', Object.fromEntries(dualResponse.headers.entries()));
        console.log('═══════════════════════════════════════════════════════════');
        
      if (dualResponse.ok) {
        dualResult = await dualResponse.json();
        console.log('✅ Envío dual PV + RH al MIR exitoso:', dualResult);
          console.log('🔍 Comunicaciones guardadas:', dualResult.comunicaciones);
          console.log('🔍 Estado:', dualResult.estado);
          mirEstadoFinal = 'enviado';
        
        // Actualizar el registro con el estado del MIR dual y crear vinculación
        const updatedData = {
          ...storedData,
          mir_status: {
            lote: dualResult.resultados?.pv?.lote || dualResult.resultados?.rh?.lote || null,
            codigoComunicacion: dualResult.resultados?.pv?.codigoComunicacion || dualResult.resultados?.rh?.codigoComunicacion || null,
            fechaEnvio: new Date().toISOString(),
            estado: dualResult.estado || 'enviado',
            comunicaciones: dualResult.comunicaciones || [],
            resultados: {
              pv: dualResult.resultados?.pv || null,
              rh: dualResult.resultados?.rh || null
            }
          }
        };
        
          // Actualizar el registro con el estado MIR (reserva_ref y comunicacion_id ya están correctos)
        const { sql: pgSql } = await import('@vercel/postgres');
        await pgSql`
          UPDATE guest_registrations 
          SET 
              data = ${JSON.stringify(updatedData)}::jsonb
          WHERE id = ${id}
        `;
        
        console.log('✅ Estado MIR dual guardado en el registro');
      } else {
          // Intentar leer el error de la respuesta
          let errorText = '';
          try {
            errorText = await dualResponse.text();
            console.error('❌ Error en respuesta del endpoint dual:', errorText);
            try {
              dualError = JSON.parse(errorText);
            } catch {
              dualError = { error: errorText, status: dualResponse.status };
            }
          } catch (e) {
            dualError = { error: `HTTP ${dualResponse.status}: ${dualResponse.statusText}`, status: dualResponse.status };
          }
          
          console.error('❌ Error en envío dual al MIR:', dualError);

          const isMissingCreds = (dualError as any)?.code === 'MIR_CREDENTIALS_MISSING';
          mirEstadoFinal = isMissingCreds ? 'pendiente' : 'error';

          // Persistir el estado MIR en guest_registrations (para que el propietario lo vea sin ir a logs)
          try {
            const updatedData = {
              ...storedData,
              mir_status: {
                error: (dualError as any)?.message || (dualError as any)?.error || `HTTP ${dualResponse.status}: ${dualResponse.statusText}`,
                fechaEnvio: new Date().toISOString(),
                estado: isMissingCreds ? 'pendiente' : 'error',
                reason: isMissingCreds ? 'credenciales_no_configuradas' : undefined,
              },
            };
            const { sql: pgSql } = await import('@vercel/postgres');
            await pgSql`
              UPDATE guest_registrations
              SET data = ${JSON.stringify(updatedData)}::jsonb
              WHERE id = ${id}
            `;
          } catch (e) {
            console.warn('⚠️ No se pudo persistir mir_status en guest_registrations:', e);
          }
          
          // Guardar error en mir_comunicaciones para que aparezca en la página de estados
          try {
            const { sql: pgSql } = await import('@vercel/postgres');
            const { insertMirComunicacion } = await import('@/lib/mir-db');
            
            // Guardar error para PV
            await insertMirComunicacion({
              referencia: `${reserva_ref}-PV`,
              tipo: 'PV',
              estado: isMissingCreds ? 'pendiente' : 'error',
              error: isMissingCreds
                ? 'Pendiente de credenciales MIR'
                : `Error HTTP ${dualResponse.status}: ${(dualError as any)?.error || dualResponse.statusText}`,
              resultado: JSON.stringify(dualError),
              tenant_id: tenantId || null
            });
            
            // Guardar error para RH
            await insertMirComunicacion({
              referencia: `${reserva_ref}-RH`,
              tipo: 'RH',
              estado: isMissingCreds ? 'pendiente' : 'error',
              error: isMissingCreds
                ? 'Pendiente de credenciales MIR'
                : `Error HTTP ${dualResponse.status}: ${(dualError as any)?.error || dualResponse.statusText}`,
              resultado: JSON.stringify(dualError),
              tenant_id: tenantId || null
            });
            
            console.log('✅ Errores guardados en mir_comunicaciones');
          } catch (saveError) {
            console.error('❌ Error guardando errores en mir_comunicaciones:', saveError);
          }
      }
      
      console.log('📊 Resumen de envío dual MIR:', {
        estado: dualResult?.estado || 'error',
        pv: dualResult?.resultados?.pv ? { success: dualResult.resultados.pv.ok, lote: dualResult.resultados.pv.lote } : { success: false },
          rh: dualResult?.resultados?.rh ? { success: dualResult.resultados.rh.ok, lote: dualResult.resultados.rh.lote } : { success: false },
          error: dualError
      });
      
      } catch (fetchError) {
        console.error('❌ Error en fetch al endpoint dual:', fetchError);
        dualError = fetchError instanceof Error ? fetchError.message : String(fetchError);
        mirEstadoFinal = 'error';
        
        // Guardar error en mir_comunicaciones para que aparezca en la página de estados
        try {
          const { insertMirComunicacion } = await import('@/lib/mir-db');
          
          // Guardar error para PV
          await insertMirComunicacion({
            referencia: `${reserva_ref}-PV`,
            tipo: 'PV',
            estado: 'error',
            error: `Error de conexión: ${dualError}`,
            resultado: JSON.stringify({ error: dualError, tipo: 'fetch_error' }),
            tenant_id: tenantId || null
          });
          
          // Guardar error para RH
          await insertMirComunicacion({
            referencia: `${reserva_ref}-RH`,
            tipo: 'RH',
            estado: 'error',
            error: `Error de conexión: ${dualError}`,
            resultado: JSON.stringify({ error: dualError, tipo: 'fetch_error' }),
            tenant_id: tenantId || null
          });
          
          console.log('✅ Errores de conexión guardados en mir_comunicaciones');
        } catch (saveError) {
          console.error('❌ Error guardando errores de conexión en mir_comunicaciones:', saveError);
        }
      }
    } catch (mirError) {
      console.error('⚠️ Error en envío dual al MIR, pero registro guardado correctamente:', mirError);
    }

    const headers = cors(req);
    return NextResponse.json({ 
      success: true, 
      message:
        mirEstadoFinal === 'enviado'
          ? 'Registro guardado y enviado al MIR correctamente (PV + RH)'
          : mirEstadoFinal === 'pendiente'
            ? 'Registro guardado. Envío al MIR pendiente (faltan credenciales MIR del propietario).'
            : 'Registro guardado, pero hubo un error al enviar al MIR. Revisa “Estado envíos MIR”.',
      id: id,
      reserva_ref: reserva_ref, // Usar referencia única generada
      comunicacion_id: comunicacion_id, // Incluir comunicacion_id en la respuesta
      date: new Date().toISOString().split('T')[0],
      mir: {
        estado: mirEstadoFinal,
        resultados: dualResult?.resultados || null,
        error: dualError || null,
        referencia: reserva_ref,
      },
      debug: {
        seguimiento_url: `${req.nextUrl.origin}/api/debug/seguimiento-mir?reserva_ref=${reserva_ref}&tenant_id=${tenantId}`,
        guest_id: id
      }
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
