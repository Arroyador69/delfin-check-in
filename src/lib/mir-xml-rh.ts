/**
 * 🏨 GENERADOR XML PARA RESERVAS DE HOSPEDAJE (RH)
 * 
 * Genera XML según el esquema oficial para Reservas de Hospedaje
 * Basado en los esquemas XSD oficiales del MIR
 */

// Tipos para RH (Reservas de Hospedaje)
export interface RhContrato {
  referencia: string;
  fechaContrato: string; // xsd:date (YYYY-MM-DD)
  fechaEntrada: string; // xsd:dateTime (YYYY-MM-DDTHH:mm:ss)
  fechaSalida: string; // xsd:dateTime (YYYY-MM-DDTHH:mm:ss)
  numPersonas: number;
  numHabitaciones?: number;
  internet?: boolean;
  pago: {
    tipoPago: string;
    fechaPago?: string; // xsd:date (YYYY-MM-DD)
    medioPago?: string;
    titular?: string;
    caducidadTarjeta?: string;
  };
}

export interface RhPersona {
  rol: 'TI' | 'VI'; // TI = Titular del contrato, VI = Viajero
  nombre: string;
  apellido1: string;
  apellido2?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  soporteDocumento?: string;
  fechaNacimiento?: string;
  nacionalidad?: string;
  sexo?: 'M' | 'F';
  direccion?: {
    direccion?: string;
    direccionComplementaria?: string;
    codigoPostal?: string;
    pais?: string;
    codigoMunicipio?: string;
    nombreMunicipio?: string;
  };
  telefono?: string;
  telefono2?: string;
  correo?: string;
  parentesco?: string;
}

export interface RhSolicitud {
  codigoEstablecimiento: string;
  contrato: RhContrato;
  personas: RhPersona[];
}

// Función para escapar caracteres XML
function escapeXml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Función para construir XML de una persona
function buildPersonaXml(persona: RhPersona): string {
  const esc = escapeXml;
  
  let xml = `      <persona>
        <rol>${esc(persona.rol)}</rol>
        <nombre>${esc(persona.nombre)}</nombre>
        <apellido1>${esc(persona.apellido1)}</apellido1>`;
  
  if (persona.apellido2) {
    xml += `\n        <apellido2>${esc(persona.apellido2)}</apellido2>`;
  }
  
  if (persona.tipoDocumento) {
    xml += `\n        <tipoDocumento>${esc(persona.tipoDocumento)}</tipoDocumento>`;
  }
  
  if (persona.numeroDocumento) {
    xml += `\n        <numeroDocumento>${esc(persona.numeroDocumento)}</numeroDocumento>`;
  }
  
  if (persona.soporteDocumento) {
    xml += `\n        <soporteDocumento>${esc(persona.soporteDocumento)}</soporteDocumento>`;
  }
  
  if (persona.fechaNacimiento) {
    xml += `\n        <fechaNacimiento>${esc(persona.fechaNacimiento)}</fechaNacimiento>`;
  }
  
  if (persona.nacionalidad) {
    xml += `\n        <nacionalidad>${esc(persona.nacionalidad)}</nacionalidad>`;
  }
  
  if (persona.sexo) {
    xml += `\n        <sexo>${esc(persona.sexo)}</sexo>`;
  }
  
  // Dirección (orden según tiposGenerales.xsd: direccion, direccionComplementaria?, codigoMunicipio?, nombreMunicipio?, codigoPostal, pais)
  if (persona.direccion) {
    xml += `\n        <direccion>`;
    
    if (persona.direccion.direccion) {
      xml += `\n          <direccion>${esc(persona.direccion.direccion)}</direccion>`;
    }
    
    if (persona.direccion.direccionComplementaria) {
      xml += `\n          <direccionComplementaria>${esc(persona.direccion.direccionComplementaria)}</direccionComplementaria>`;
    }
    
    if (persona.direccion.codigoMunicipio) {
      xml += `\n          <codigoMunicipio>${esc(persona.direccion.codigoMunicipio)}</codigoMunicipio>`;
    }
    
    if (persona.direccion.nombreMunicipio) {
      xml += `\n          <nombreMunicipio>${esc(persona.direccion.nombreMunicipio)}</nombreMunicipio>`;
    }
    
    if (persona.direccion.codigoPostal) {
      xml += `\n          <codigoPostal>${esc(persona.direccion.codigoPostal)}</codigoPostal>`;
    }
    
    if (persona.direccion.pais) {
      xml += `\n          <pais>${esc(persona.direccion.pais)}</pais>`;
    }
    
    xml += `\n        </direccion>`;
  }
  
  // Teléfonos y correo directamente bajo persona (sin contenedor <contacto>) según XSD
  if (persona.telefono) {
    xml += `\n        <telefono>${esc(persona.telefono)}</telefono>`;
  }
  if (persona.telefono2) {
    xml += `\n        <telefono2>${esc(persona.telefono2)}</telefono2>`;
  }
  if (persona.correo) {
    xml += `\n        <correo>${esc(persona.correo)}</correo>`;
  }
  
  if (persona.parentesco) {
    xml += `\n        <parentesco>${esc(persona.parentesco)}</parentesco>`;
  }
  
  xml += `\n      </persona>`;
  
  return xml;
}

// Función para construir XML del contrato
function buildContratoXml(contrato: RhContrato): string {
  const esc = escapeXml;
  
  let xml = `      <contrato>
        <referencia>${esc(contrato.referencia)}</referencia>
        <fechaContrato>${esc(contrato.fechaContrato)}</fechaContrato>
        <fechaEntrada>${esc(contrato.fechaEntrada)}</fechaEntrada>
        <fechaSalida>${esc(contrato.fechaSalida)}</fechaSalida>
        <numPersonas>${contrato.numPersonas}</numPersonas>`;
  
  if (contrato.numHabitaciones !== undefined) {
    xml += `\n        <numHabitaciones>${contrato.numHabitaciones}</numHabitaciones>`;
  }
  
  if (contrato.internet !== undefined) {
    xml += `\n        <internet>${contrato.internet ? 'true' : 'false'}</internet>`;
  }
  
  // Pago
  xml += `\n        <pago>
          <tipoPago>${esc(contrato.pago.tipoPago)}</tipoPago>`;
  
  if (contrato.pago.fechaPago) {
    xml += `\n          <fechaPago>${esc(contrato.pago.fechaPago)}</fechaPago>`;
  }
  
  if (contrato.pago.medioPago) {
    xml += `\n          <medioPago>${esc(contrato.pago.medioPago)}</medioPago>`;
  }
  
  if (contrato.pago.titular) {
    xml += `\n          <titular>${esc(contrato.pago.titular)}</titular>`;
  }
  
  if (contrato.pago.caducidadTarjeta) {
    xml += `\n          <caducidadTarjeta>${esc(contrato.pago.caducidadTarjeta)}</caducidadTarjeta>`;
  }
  
  xml += `\n        </pago>
      </contrato>`;
  
  return xml;
}

// Función principal que construye el XML completo para RH
export function buildRhXml(input: RhSolicitud): string {
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
  
  // Validar que hay al menos un titular (TI)
  const tieneTitular = input.personas.some(p => p.rol === 'TI');
  if (!tieneTitular) {
    throw new Error('Debe haber al menos una persona con rol TI (Titular del contrato)');
  }
  
  const esc = escapeXml;
  
  // Construir XML de personas
  const personasXml = input.personas.map(buildPersonaXml).join('\n');
  
  // Construir XML del contrato
  const contratoXml = buildContratoXml(input.contrato);
  
  // XML completo según esquema de Reservas de Hospedaje
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<alt:peticion xmlns:alt="http://www.neg.hospedajes.mir.es/altaReservaHospedaje">
  <solicitud>
    <comunicacion>
      <establecimiento>
        <codigo>${esc(input.codigoEstablecimiento)}</codigo>
      </establecimiento>${contratoXml}
      ${personasXml}
    </comunicacion>
  </solicitud>
</alt:peticion>`;
  
  return xml;
}

// Función de utilidad para crear datos de prueba válidos para RH
export function createTestRhData(): RhSolicitud {
  return {
    codigoEstablecimiento: "0000256653",
    contrato: {
      referencia: `RH-TEST-${Date.now()}`,
      fechaContrato: new Date().toISOString().split('T')[0],
      fechaEntrada: new Date().toISOString().replace(/\.\d{3}Z$/, ''),
      fechaSalida: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, ''),
      numPersonas: 2,
      numHabitaciones: 1,
      internet: false,
      pago: {
        tipoPago: "EFECT",
        fechaPago: new Date().toISOString().split('T')[0]
      }
    },
    personas: [
      {
        rol: "TI",
        nombre: "Juan",
        apellido1: "García",
        apellido2: "López",
        tipoDocumento: "NIF",
        numeroDocumento: "12345678Z",
        soporteDocumento: "12345678Z",
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
        correo: "juan@example.com"
      },
      {
        rol: "VI",
        nombre: "María",
        apellido1: "García",
        apellido2: "López",
        tipoDocumento: "NIF",
        numeroDocumento: "87654321Y",
        soporteDocumento: "87654321Y",
        fechaNacimiento: "1987-05-15",
        nacionalidad: "ESP",
        sexo: "F",
        direccion: {
          direccion: "Calle Ejemplo 123",
          codigoPostal: "28001",
          pais: "ESP",
          codigoMunicipio: "28079",
          nombreMunicipio: "Madrid"
        },
        telefono: "600000001",
        correo: "maria@example.com",
        parentesco: "ESPOSA"
      }
    ]
  };
}









