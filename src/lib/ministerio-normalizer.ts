export function normalizeString(value: unknown): string {
  if (!value) return '';
  return String(value).trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeDocumento(doc: any): any {
  if (!doc) return {};
  return {
    tipo: normalizeString(doc.tipo || doc.tipoDocumento || ''),
    numero: normalizeString(doc.numero || doc.numeroDocumento || ''),
    pais: normalizeString(doc.pais || doc.paisEmisor || doc.paisExpedicion || '')
  };
}

export function normalizePersona(p: any): any {
  const nombre = normalizeString(p?.nombre);
  const apellido1 = normalizeString(p?.apellido1 || p?.apellidos?.split(' ')?.[0]);
  const apellido2 = normalizeString(p?.apellido2 || p?.apellidos?.split(' ')?.slice(1).join(' '));
  const fechaNacimiento = p?.fechaNacimiento || p?.nacimiento || null;
  const documento = normalizeDocumento(p?.documento || p);
  return { nombre, apellido1, apellido2, fechaNacimiento, documento };
}

export function normalizeContrato(c: any): any {
  return {
    referencia: normalizeString(c?.referencia || c?.reserva || ''),
    fechaEntrada: c?.fechaEntrada || c?.entrada || null,
    fechaSalida: c?.fechaSalida || c?.salida || null,
    numPersonas: Number(c?.numPersonas || c?.personas?.length || 0)
  };
}

export function normalizeComunicacion(data: any): any {
  const personasRaw = data?.comunicaciones?.[0]?.personas || data?.personas || [];
  const contratoRaw = data?.comunicaciones?.[0]?.contrato || data?.contrato || {};
  return {
    comunicaciones: [
      {
        personas: personasRaw.map(normalizePersona),
        contrato: normalizeContrato(contratoRaw)
      }
    ]
  };
}


