'use client';

import { useState } from 'react';

interface ExportButtonProps {
  solicitud: any;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// Función para normalizar fechas al formato MIR requerido
function normalizeDateForMIR(dateValue: any, fallbackDate?: Date): string {
  if (!dateValue) {
    const fallback = fallbackDate || new Date();
    return fallback.toISOString();
  }
  
  // Si ya es una fecha ISO válida con tiempo, devolverla
  if (typeof dateValue === 'string' && dateValue.length >= 19 && dateValue.includes('T')) {
    return dateValue;
  }
  
  // Si es solo una fecha (YYYY-MM-DD), agregar tiempo
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return `${dateValue}T12:00:00`;
  }
  
  // Si es una fecha en formato DD/MM/YYYY, convertir
  if (typeof dateValue === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
    const [day, month, year] = dateValue.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`;
  }
  
  // Intentar parsear como fecha
  try {
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  } catch (e) {
    console.warn('Error parsing date:', dateValue, e);
  }
  
  // Fallback
  const fallback = fallbackDate || new Date();
  return fallback.toISOString();
}

// Función para extraer fechas del registro con múltiples fuentes posibles
function extractDatesFromRegistration(registration: any) {
  console.log('🔍 Extrayendo fechas del registro:', JSON.stringify(registration, null, 2));
  
  let fechaEntrada: string | null = null;
  let fechaSalida: string | null = null;
  
  // Buscar en múltiples ubicaciones posibles
  const possibleSources = [
    // Nivel raíz del registro
    {
      entrada: registration.fecha_entrada,
      salida: registration.fecha_salida
    },
    // Dentro de data
    {
      entrada: registration.data?.fecha_entrada,
      salida: registration.data?.fecha_salida
    },
    // Dentro de contrato en data
    {
      entrada: registration.data?.contrato?.fechaEntrada,
      salida: registration.data?.contrato?.fechaSalida
    },
    // Dentro de comunicaciones[0].contrato
    {
      entrada: registration.data?.comunicaciones?.[0]?.contrato?.fechaEntrada,
      salida: registration.data?.comunicaciones?.[0]?.contrato?.fechaSalida
    },
    // Campos directos en comunicaciones[0]
    {
      entrada: registration.data?.comunicaciones?.[0]?.fechaEntrada,
      salida: registration.data?.comunicaciones?.[0]?.fechaSalida
    },
    // Campos de entrada/salida directos
    {
      entrada: registration.data?.comunicaciones?.[0]?.entrada,
      salida: registration.data?.comunicaciones?.[0]?.salida
    }
  ];
  
  // Buscar la primera fuente válida
  for (const source of possibleSources) {
    if (source.entrada && !fechaEntrada) {
      fechaEntrada = source.entrada;
      console.log('✅ Fecha entrada encontrada:', fechaEntrada);
    }
    if (source.salida && !fechaSalida) {
      fechaSalida = source.salida;
      console.log('✅ Fecha salida encontrada:', fechaSalida);
    }
    
    if (fechaEntrada && fechaSalida) break;
  }
  
  // Si no se encontraron, usar fechas por defecto
  if (!fechaEntrada) {
    fechaEntrada = new Date().toISOString().split('T')[0];
    console.warn('⚠️ No se encontró fecha entrada, usando por defecto:', fechaEntrada);
  }
  
  if (!fechaSalida) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    fechaSalida = tomorrow.toISOString().split('T')[0];
    console.warn('⚠️ No se encontró fecha salida, usando por defecto:', fechaSalida);
  }
  
  return {
    fechaEntrada: normalizeDateForMIR(fechaEntrada),
    fechaSalida: normalizeDateForMIR(fechaSalida)
  };
}

// Función para normalizar datos antes del envío
export function normalizeData(rawData: any) {
  console.log('🔄 Normalizando datos para MIR:', JSON.stringify(rawData, null, 2));
  
  // Extraer fechas con lógica robusta
  const { fechaEntrada, fechaSalida } = extractDatesFromRegistration(rawData);
  
  // Asegurar que comunicaciones es un array
  const comunicaciones = Array.isArray(rawData.comunicaciones) 
    ? rawData.comunicaciones 
    : rawData.comunicaciones 
      ? [rawData.comunicaciones] 
      : [];

  const normalized = {
    codigoEstablecimiento: rawData.codigoEstablecimiento || '0000256653',
    comunicaciones: comunicaciones.map((com: any) => ({
      contrato: {
        referencia: com.contrato?.referencia || com.referencia || '0000146967',
        fechaContrato: normalizeDateForMIR(
          com.contrato?.fechaContrato || com.fechaContrato,
          new Date()
        ),
        fechaEntrada: fechaEntrada,
        fechaSalida: fechaSalida,
        numPersonas: com.contrato?.numPersonas || com.personas?.length || com.viajeros?.length || 1,
        numHabitaciones: com.contrato?.numHabitaciones || 1,
        internet: com.contrato?.internet || false,
        pago: {
          tipoPago: com.contrato?.pago?.tipoPago || com.pago?.tipoPago || 'EFECT',
          fechaPago: com.contrato?.pago?.fechaPago || com.pago?.fechaPago,
          medioPago: com.contrato?.pago?.medioPago || com.pago?.medioPago,
          titular: com.contrato?.pago?.titular || com.pago?.titular,
          caducidadTarjeta: com.contrato?.pago?.caducidadTarjeta || com.pago?.caducidadTarjeta,
        }
      },
      personas: (com.personas || com.viajeros || []).map((persona: any) => ({
        rol: 'VI',
        nombre: persona.nombre || '',
        apellido1: persona.apellido1 || persona.apellidos?.split(' ')[0] || '',
        apellido2: persona.apellido2 || persona.apellidos?.split(' ')[1],
        tipoDocumento: persona.tipoDocumento || persona.tipo_documento,
        numeroDocumento: persona.numeroDocumento || persona.documento || persona.numero_documento,
        soporteDocumento: persona.soporteDocumento || persona.soporte_documento,
        fechaNacimiento: persona.fechaNacimiento || persona.fecha_nacimiento || '',
        nacionalidad: persona.nacionalidad,
        sexo: persona.sexo,
        // Asegurar que al menos un contacto esté presente
        // Manejar estructura de contacto anidado
        telefono: persona.telefono || persona.contacto?.telefono || persona.telefono2 || '000000000',
        telefono2: persona.telefono2 || persona.contacto?.telefono2 || '',
        correo: persona.correo || persona.email || persona.contacto?.correo || 'no-email@example.com',
        direccion: {
          direccion: persona.direccion?.direccion || persona.direccion || '',
          direccionComplementaria: persona.direccion?.direccionComplementaria || persona.direccion_complementaria,
          codigoPostal: persona.direccion?.codigoPostal || persona.codigo_postal || '',
          // País: si hay nacionalidad extranjera, forzar país = nacionalidad
          pais: (() => {
            const nat = (persona.nacionalidad || '').toUpperCase();
            const candidate = (persona.direccion?.pais || persona.pais || '').toUpperCase();
            if (nat && nat !== 'ESP') return nat;
            return candidate || 'ESP';
          })(),
          // INE solo si el país final es España
          codigoMunicipio: (() => {
            const nat = (persona.nacionalidad || '').toUpperCase();
            const candidatePais = (persona.direccion?.pais || persona.pais || '').toUpperCase();
            const finalPais = (nat && nat !== 'ESP') ? nat : (candidatePais || 'ESP');
            if (finalPais !== 'ESP') return undefined;
            return persona.direccion?.codigoMunicipio || persona.codigo_municipio;
          })(),
          nombreMunicipio: persona.direccion?.nombreMunicipio || persona.nombre_municipio
        }
      }))
    }))
  };
  
  console.log('✅ Datos normalizados:', JSON.stringify(normalized, null, 2));
  return normalized;
}

// Función principal de exportación
async function exportXML(payload: any): Promise<void> {
  const res = await fetch('/api/export/pv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Intentar leer JSON; si no, texto
    let error: any = { 
      error: `${res.status} ${res.statusText}`, 
      details: [] as string[],
      correlationId: res.headers.get('x-correlation-id') || 'N/A'
    };
    
    try {
      const j = await res.json();
      error = { ...error, ...j };
    } catch {
      try {
        const t = await res.text();
        error.error = t || error.error;
      } catch {}
    }
    
    console.error('❌ Error del servidor:', JSON.stringify(error, null, 2));
    
    if (Array.isArray(error.details) && error.details.length) {
      throw new Error(`Errores de validación MIR:\n${error.details.join('\n')}\n\nID: ${error.correlationId}`);
    }
    
    throw new Error(`${error.error}\nID: ${error.correlationId}`);
  }

  // Descargar archivo
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `partes_viajeros_${new Date().toISOString().slice(0,10)}.xml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ExportButton({ solicitud, onSuccess, onError }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      console.log('🔄 Iniciando exportación XML...');
      
      // Normalizar datos
      const normalizedPayload = normalizeData(solicitud);
      console.log('📤 Payload normalizado:', JSON.stringify(normalizedPayload, null, 2));
      
      // Exportar
      await exportXML(normalizedPayload);
      
      console.log('✅ XML generado y descargado exitosamente');
      onSuccess?.();
      
    } catch (e: any) {
      console.error('❌ Error en exportación:', e);
      const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleExport} 
      disabled={loading} 
      className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
    >
      {loading ? 'Generando XML...' : 'Descargar XML MIR'}
    </button>
  );
}
