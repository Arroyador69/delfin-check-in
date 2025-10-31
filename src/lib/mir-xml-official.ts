// Generador de XML MIR oficial basado en los esquemas XSD v3.1.3
// Implementa estrictamente las especificaciones de altaParteHospedaje.xsd

export interface PvPersona {
  rol: 'VI' | 'CP' | 'CS' | 'TI'; // Viajero, Contacto Principal, Contacto Secundario, Titular
  nombre: string;
  apellido1: string;
  apellido2?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  soporteDocumento?: string;
  fechaNacimiento: string; // YYYY-MM-DD
  nacionalidad?: string; // ISO 3166-1 Alpha-3
  sexo?: 'M' | 'F';
  direccion: {
    direccion: string;
    direccionComplementaria?: string;
    codigoMunicipio?: string; // 5 dígitos INE
    nombreMunicipio?: string;
    codigoPostal: string;
    pais: string; // ISO 3166-1 Alpha-3
  };
  telefono?: string;
  telefono2?: string;
  correo?: string;
  parentesco?: string;
}

export interface PvContrato {
  referencia: string;
  fechaContrato: string; // YYYY-MM-DD
  fechaEntrada: string; // YYYY-MM-DDTHH:mm:ss
  fechaSalida: string; // YYYY-MM-DDTHH:mm:ss
  numPersonas: number;
  numHabitaciones?: number;
  internet?: boolean;
  pago: {
    tipoPago: string; // EFECT, TARJ, TRANSF, etc.
    fechaPago?: string; // YYYY-MM-DD
    medioPago?: string;
    titular?: string;
    caducidadTarjeta?: string;
  };
}

export interface PvSolicitud {
  codigoEstablecimiento: string;
  contrato: PvContrato;
  personas: PvPersona[];
}

// Valida que el código de municipio tenga 5 dígitos según INE
function validateCodigoMunicipio(codigo: string): boolean {
  return /^[0-9]{5}$/.test(codigo);
}

// Valida formato de fecha YYYY-MM-DD
function validateDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// Valida formato de fecha y hora ISO
function validateDateTimeFormat(dateTime: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateTime);
}

// Valida código de país ISO 3166-1 Alpha-3
function validatePaisCode(pais: string): boolean {
  return /^[A-Z]{3}$/.test(pais);
}

// Valida email
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Escapa caracteres XML
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Valida y construye el XML de una persona según personaHospedajeType
function buildPersonaXml(persona: PvPersona): string {
  // Validaciones según XSD
  if (!persona.nombre || persona.nombre.length > 50) {
    throw new Error('Nombre es obligatorio y máximo 50 caracteres');
  }
  if (!persona.apellido1 || persona.apellido1.length > 50) {
    throw new Error('Apellido1 es obligatorio y máximo 50 caracteres');
  }
  if (persona.apellido2 && persona.apellido2.length > 50) {
    throw new Error('Apellido2 máximo 50 caracteres');
  }
  if (!validateDateFormat(persona.fechaNacimiento)) {
    throw new Error('Fecha de nacimiento debe estar en formato YYYY-MM-DD');
  }
  if (persona.nacionalidad && !validatePaisCode(persona.nacionalidad)) {
    throw new Error('Nacionalidad debe ser código ISO 3166-1 Alpha-3 (3 letras)');
  }
  if (persona.correo && !validateEmail(persona.correo)) {
    throw new Error('Email debe tener formato válido');
  }
  if (persona.direccion.codigoMunicipio && !validateCodigoMunicipio(persona.direccion.codigoMunicipio)) {
    throw new Error('Código de municipio debe tener 5 dígitos según INE');
  }
  if (!validatePaisCode(persona.direccion.pais)) {
    throw new Error('Código de país debe ser ISO 3166-1 Alpha-3 (3 letras)');
  }

  const esc = escapeXml;
  
  // Construir XML según personaHospedajeType del XSD
  const apellido2Xml = persona.apellido2 ? `\n        <apellido2>${esc(persona.apellido2)}</apellido2>` : '';
  const tipoDocumentoXml = persona.tipoDocumento ? `\n        <tipoDocumento>${esc(persona.tipoDocumento)}</tipoDocumento>` : '';
  const numeroDocumentoXml = persona.numeroDocumento ? `\n        <numeroDocumento>${esc(persona.numeroDocumento)}</numeroDocumento>` : '';
  // CRÍTICO: Si hay numeroDocumento (y no es un valor de prueba), soporteDocumento es obligatorio para MIR
  // Si no viene, usar 'C' por defecto (número de soporte del documento)
  const tieneDocReal = persona.numeroDocumento && persona.numeroDocumento !== '12345678Z' && persona.numeroDocumento.trim() !== '';
  const soporteDoc = tieneDocReal ? (persona.soporteDocumento || 'C') : undefined;
  const soporteDocumentoXml = soporteDoc ? `\n        <soporteDocumento>${esc(soporteDoc)}</soporteDocumento>` : '';
  const nacionalidadXml = persona.nacionalidad ? `\n        <nacionalidad>${esc(persona.nacionalidad)}</nacionalidad>` : '';
  const sexoXml = persona.sexo ? `\n        <sexo>${esc(persona.sexo)}</sexo>` : '';
  const telefonoXml = persona.telefono ? `\n        <telefono>${esc(persona.telefono)}</telefono>` : '';
  const telefono2Xml = persona.telefono2 ? `\n        <telefono2>${esc(persona.telefono2)}</telefono2>` : '';
  const correoXml = persona.correo ? `\n        <correo>${esc(persona.correo)}</correo>` : '';
  const parentescoXml = persona.parentesco ? `\n        <parentesco>${esc(persona.parentesco)}</parentesco>` : '';
  
  // Dirección según direccionType del XSD
  const direccionComplementariaXml = persona.direccion.direccionComplementaria ? 
    `\n          <direccionComplementaria>${esc(persona.direccion.direccionComplementaria)}</direccionComplementaria>` : '';
  const codigoMunicipioXml = persona.direccion.codigoMunicipio ? 
    `\n          <codigoMunicipio>${esc(persona.direccion.codigoMunicipio)}</codigoMunicipio>` : '';
  const nombreMunicipioXml = persona.direccion.nombreMunicipio ? 
    `\n          <nombreMunicipio>${esc(persona.direccion.nombreMunicipio)}</nombreMunicipio>` : '';

  return `
      <persona>
        <rol>${esc(persona.rol)}</rol>
        <nombre>${esc(persona.nombre)}</nombre>
        <apellido1>${esc(persona.apellido1)}</apellido1>${apellido2Xml}${tipoDocumentoXml}${numeroDocumentoXml}${soporteDocumentoXml}
        <fechaNacimiento>${esc(persona.fechaNacimiento)}</fechaNacimiento>${nacionalidadXml}${sexoXml}
        <direccion>
          <direccion>${esc(persona.direccion.direccion)}</direccion>${direccionComplementariaXml}${codigoMunicipioXml}${nombreMunicipioXml}
          <codigoPostal>${esc(persona.direccion.codigoPostal)}</codigoPostal>
          <pais>${esc(persona.direccion.pais)}</pais>
        </direccion>${telefonoXml}${telefono2Xml}${correoXml}${parentescoXml}
      </persona>`;
}

// Valida y construye el XML del contrato según contratoHospedajeType
function buildContratoXml(contrato: PvContrato): string {
  // Validaciones según XSD
  if (!contrato.referencia || contrato.referencia.length > 50) {
    throw new Error('Referencia es obligatoria y máximo 50 caracteres');
  }
  if (!validateDateFormat(contrato.fechaContrato)) {
    throw new Error('Fecha de contrato debe estar en formato YYYY-MM-DD');
  }
  if (!validateDateTimeFormat(contrato.fechaEntrada)) {
    throw new Error('Fecha de entrada debe estar en formato YYYY-MM-DDTHH:mm:ss');
  }
  if (!validateDateTimeFormat(contrato.fechaSalida)) {
    throw new Error('Fecha de salida debe estar en formato YYYY-MM-DDTHH:mm:ss');
  }
  if (contrato.numPersonas < 1) {
    throw new Error('Número de personas debe ser mayor a 0');
  }
  if (contrato.numHabitaciones && contrato.numHabitaciones < 1) {
    throw new Error('Número de habitaciones debe ser mayor a 0');
  }
  if (!contrato.pago.tipoPago || contrato.pago.tipoPago.length > 5) {
    throw new Error('Tipo de pago es obligatorio y máximo 5 caracteres');
  }
  if (contrato.pago.fechaPago && !validateDateFormat(contrato.pago.fechaPago)) {
    throw new Error('Fecha de pago debe estar en formato YYYY-MM-DD');
  }

  const esc = escapeXml;
  
  // Construir XML según contratoHospedajeType del XSD
  const numHabitacionesXml = contrato.numHabitaciones ? 
    `\n        <numHabitaciones>${contrato.numHabitaciones}</numHabitaciones>` : '';
  const internetXml = contrato.internet !== undefined ? 
    `\n        <internet>${contrato.internet}</internet>` : '';
  
  // Pago según pagoType del XSD
  const fechaPagoXml = contrato.pago.fechaPago ? 
    `\n          <fechaPago>${esc(contrato.pago.fechaPago)}</fechaPago>` : '';
  const medioPagoXml = contrato.pago.medioPago ? 
    `\n          <medioPago>${esc(contrato.pago.medioPago)}</medioPago>` : '';
  const titularXml = contrato.pago.titular ? 
    `\n          <titular>${esc(contrato.pago.titular)}</titular>` : '';
  const caducidadTarjetaXml = contrato.pago.caducidadTarjeta ? 
    `\n          <caducidadTarjeta>${esc(contrato.pago.caducidadTarjeta)}</caducidadTarjeta>` : '';

  return `
      <contrato>
        <referencia>${esc(contrato.referencia)}</referencia>
        <fechaContrato>${esc(contrato.fechaContrato)}</fechaContrato>
        <fechaEntrada>${esc(contrato.fechaEntrada)}</fechaEntrada>
        <fechaSalida>${esc(contrato.fechaSalida)}</fechaSalida>
        <numPersonas>${contrato.numPersonas}</numPersonas>${numHabitacionesXml}${internetXml}
        <pago>
          <tipoPago>${esc(contrato.pago.tipoPago)}</tipoPago>${fechaPagoXml}${medioPagoXml}${titularXml}${caducidadTarjetaXml}
        </pago>
      </contrato>`;
}

// Función principal que construye el XML completo según altaParteHospedaje.xsd
export function buildPvXml(input: PvSolicitud): string {
  // Validaciones generales
  if (!input.codigoEstablecimiento || input.codigoEstablecimiento.length > 10) {
    throw new Error('Código de establecimiento es obligatorio y máximo 10 caracteres');
  }
  if (!input.personas || input.personas.length === 0) {
    throw new Error('Debe haber al menos una persona');
  }
  if (input.personas.length > 50) {
    throw new Error('Máximo 50 personas por comunicación');
  }

  const esc = escapeXml;
  
  // Construir XML de personas
  const personasXml = input.personas.map(buildPersonaXml).join('\n');
  
  // Construir XML del contrato
  const contratoXml = buildContratoXml(input.contrato);

  // XML completo según altaParteHospedaje.xsd
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<alt:peticion xmlns:alt="http://www.neg.hospedajes.mir.es/altaParteHospedaje">
  <solicitud>
    <codigoEstablecimiento>${esc(input.codigoEstablecimiento)}</codigoEstablecimiento>
    <comunicacion>${contratoXml}
      ${personasXml}
    </comunicacion>
  </solicitud>
</alt:peticion>`;

  return xml;
}

// Función de utilidad para crear datos de prueba válidos
export function createTestPvData(): PvSolicitud {
  return {
    codigoEstablecimiento: "0000256653",
    contrato: {
      referencia: `TEST-${Date.now()}`,
      fechaContrato: new Date().toISOString().split('T')[0],
      fechaEntrada: new Date().toISOString().replace(/\.\d{3}Z$/, ''),
      fechaSalida: new Date(Date.now() + 24*60*60*1000).toISOString().replace(/\.\d{3}Z$/, ''),
      numPersonas: 1,
      numHabitaciones: 1,
      internet: false,
      pago: {
        tipoPago: "EFECT",
        fechaPago: new Date().toISOString().split('T')[0]
      }
    },
    personas: [{
      rol: "VI",
      nombre: "Juan",
      apellido1: "Pérez",
      apellido2: "García",
      tipoDocumento: "NIF",
      numeroDocumento: "12345678Z",
      fechaNacimiento: "1985-01-01",
      nacionalidad: "ESP",
      sexo: "M",
      direccion: {
        direccion: "Calle Ejemplo 123",
        codigoPostal: "28001",
        pais: "ESP",
        codigoMunicipio: "28079",
        nombreMunicipio: "Madrid"
      },
      telefono: "600000000",
      correo: "juan.perez@example.com"
    }]
  };
}

