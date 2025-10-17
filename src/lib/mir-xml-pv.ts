export interface PvPersona {
  nombre: string;
  apellido1: string;
  apellido2?: string;
  tipoDocumento: 'NIF' | 'NIE' | 'PAS';
  numeroDocumento: string;
  fechaNacimiento: string; // AAAA-MM-DD
  correo?: string;
  telefono?: string;
  telefono2?: string;
  direccion: {
    direccion: string;
    codigoPostal: string;
    pais: string; // ISO3
    codigoMunicipio?: string; // obligatorio si pais = ESP
    nombreMunicipio?: string;
  };
}

export interface PvContrato {
  referencia: string;
  fechaContrato: string; // AAAA-MM-DD
  fechaEntrada: string; // AAAA-MM-DDThh:mm:ss
  fechaSalida: string; // AAAA-MM-DDThh:mm:ss
  numPersonas: number;
  tipoPago: string; // código tabla p.ej. EFECT
}

export interface PvSolicitud {
  codigoEstablecimiento: string;
  contrato: PvContrato;
  personas: PvPersona[];
}

export function buildPvXml(input: PvSolicitud): string {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const personaXml = (p: PvPersona) => {
    const contactos = p.correo || p.telefono || p.telefono2 ? `\n        ${p.correo ? `<correo>${esc(p.correo)}</correo>` : ''}${p.telefono ? `\n        <telefono>${esc(p.telefono)}</telefono>` : ''}${p.telefono2 ? `\n        <telefono2>${esc(p.telefono2)}</telefono2>` : ''}` : '';
    const muni = p.direccion.pais === 'ESP' && p.direccion.codigoMunicipio ? `\n          <codigoMunicipio>${esc(p.direccion.codigoMunicipio)}</codigoMunicipio>` : '';
    const apellido2 = p.tipoDocumento === 'NIF' ? (p.apellido2 || '') : (p.apellido2 || '');
    return `
      <persona>
        <rol>VI</rol>
        <nombre>${esc(p.nombre)}</nombre>
        <apellido1>${esc(p.apellido1)}</apellido1>
        ${apellido2 ? `<apellido2>${esc(apellido2)}</apellido2>` : ''}
        <tipoDocumento>${esc(p.tipoDocumento)}</tipoDocumento>
        <numeroDocumento>${esc(p.numeroDocumento)}</numeroDocumento>
        <fechaNacimiento>${esc(p.fechaNacimiento)}</fechaNacimiento>
        <direccion>
          <direccion>${esc(p.direccion.direccion)}</direccion>
          <codigoPostal>${esc(p.direccion.codigoPostal)}</codigoPostal>
          <pais>${esc(p.direccion.pais)}</pais>${muni}
        </direccion>${contactos}
      </persona>`;
  };

  const personasXml = input.personas.map(personaXml).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<alt:peticion xmlns:alt="http://www.neg.hospedajes.mir.es/altaParteHospedaje">
  <solicitud>
    <codigoEstablecimiento>${esc(input.codigoEstablecimiento)}</codigoEstablecimiento>
    <comunicacion>
      <contrato>
        <referencia>${esc(input.contrato.referencia)}</referencia>
        <fechaContrato>${esc(input.contrato.fechaContrato)}</fechaContrato>
        <fechaEntrada>${esc(input.contrato.fechaEntrada)}</fechaEntrada>
        <fechaSalida>${esc(input.contrato.fechaSalida)}</fechaSalida>
        <numPersonas>${input.contrato.numPersonas}</numPersonas>
        <pago>
          <tipoPago>${esc(input.contrato.tipoPago)}</tipoPago>
        </pago>
      </contrato>
      ${personasXml}
    </comunicacion>
  </solicitud>
</alt:peticion>`;

  return xml;
}


