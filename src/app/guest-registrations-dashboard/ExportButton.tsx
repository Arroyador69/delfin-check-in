'use client';

import { useState } from 'react';

interface ExportButtonProps {
  solicitud: any;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// Función para normalizar datos antes del envío
function normalizeData(rawData: any) {
  // Asegurar que comunicaciones es un array
  const comunicaciones = Array.isArray(rawData.comunicaciones) 
    ? rawData.comunicaciones 
    : rawData.comunicaciones 
      ? [rawData.comunicaciones] 
      : [];

  return {
    codigoEstablecimiento: rawData.codigoEstablecimiento || '0000256653',
    comunicaciones: comunicaciones.map((com: any) => ({
      contrato: {
        referencia: com.contrato?.referencia || com.referencia || '0000146967',
        fechaContrato: com.contrato?.fechaContrato || com.fechaContrato || new Date().toISOString().split('T')[0],
        fechaEntrada: com.contrato?.fechaEntrada || com.fechaEntrada || new Date().toISOString(),
        fechaSalida: com.contrato?.fechaSalida || com.fechaSalida || new Date().toISOString(),
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
        telefono: persona.telefono || persona.telefono2 || '000000000',
        telefono2: persona.telefono2 || '',
        correo: persona.correo || persona.email || 'no-email@example.com',
        direccion: {
          direccion: persona.direccion?.direccion || persona.direccion || '',
          direccionComplementaria: persona.direccion?.direccionComplementaria || persona.direccion_complementaria,
          codigoPostal: persona.direccion?.codigoPostal || persona.codigo_postal || '',
          pais: persona.direccion?.pais || persona.pais || 'ESP',
          codigoMunicipio: persona.direccion?.codigoMunicipio || persona.codigo_municipio,
          nombreMunicipio: persona.direccion?.nombreMunicipio || persona.nombre_municipio
        }
      }))
    }))
  };
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
