/**
 * Adapter para España - Sistema MIR (Ministerio del Interior)
 * 
 * Este adapter ENCAPSULA el código MIR existente sin duplicarlo.
 * Usa internamente:
 * - buildPvXml, buildRhXml (de mir-xml-official.ts y mir-xml-rh.ts)
 * - MinisterioClientOfficial (de ministerio-client-official.ts)
 * 
 * NO modifica el código MIR existente, solo lo envuelve en una interfaz común.
 */

import { BaseAdapter } from '../base/adapter';
import {
  CheckInPayload,
  PersonaPayload,
  ValidationResult,
  SubmitResult,
  DeadlineRules,
  RetentionPolicy,
  AdapterContext,
  FormField,
  ValidationRules,
  LegalTexts,
} from '../base/types';

// Importar código MIR existente (NO duplicar)
import { buildPvXml, PvSolicitud, PvPersona, PvContrato } from '@/lib/mir-xml-official';
import { buildRhXml, RhSolicitud, RhPersona, RhContrato } from '@/lib/mir-xml-rh';
import { MinisterioClientOfficial, MinisterioConfig } from '@/lib/ministerio-client-official';

export class SpainHospederiasAdapter extends BaseAdapter {
  readonly key = 'es-hospederias';
  readonly countryCode = 'ES';
  readonly name = 'España - Sistema MIR (Hospederías)';

  /**
   * Valida el payload antes de procesarlo
   */
  validate(input: CheckInPayload): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Validaciones básicas
    if (!input.fechaEntrada) {
      errors.push({ field: 'fechaEntrada', message: 'Fecha de entrada es obligatoria' });
    }

    if (!input.fechaSalida) {
      errors.push({ field: 'fechaSalida', message: 'Fecha de salida es obligatoria' });
    }

    if (!input.personas || input.personas.length === 0) {
      errors.push({ field: 'personas', message: 'Debe haber al menos una persona' });
    }

    if (input.personas && input.personas.length > 50) {
      errors.push({ field: 'personas', message: 'Máximo 50 personas por comunicación' });
    }

    // Validar cada persona
    input.personas?.forEach((persona, index) => {
      if (!persona.nombre) {
        errors.push({ field: `personas[${index}].nombre`, message: 'Nombre es obligatorio' });
      }
      if (!persona.apellido1) {
        errors.push({ field: `personas[${index}].apellido1`, message: 'Primer apellido es obligatorio' });
      }
      if (!persona.fechaNacimiento) {
        errors.push({ field: `personas[${index}].fechaNacimiento`, message: 'Fecha de nacimiento es obligatoria' });
      }
      if (!persona.direccion?.direccion) {
        errors.push({ field: `personas[${index}].direccion.direccion`, message: 'Dirección es obligatoria' });
      }
      if (!persona.direccion?.codigoPostal) {
        errors.push({ field: `personas[${index}].direccion.codigoPostal`, message: 'Código postal es obligatorio' });
      }
      if (!persona.direccion?.pais) {
        errors.push({ field: `personas[${index}].direccion.pais`, message: 'País es obligatorio' });
      }
    });

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return this.createValidationSuccess();
  }

  /**
   * Transforma el payload genérico al formato MIR (usa código existente)
   */
  async toAuthorityPayload(input: CheckInPayload, ctx: AdapterContext): Promise<{ pv: string; rh: string }> {
    const codigoEstablecimiento = input.codigoEstablecimiento || ctx.config.codigoEstablecimiento || '';

    // Normalizar fechas
    const asDateTime = (d: string) => (d && d.includes('T') ? d : `${d}T12:00:00`);
    const fechaEntradaDT = asDateTime(input.fechaEntrada);
    const fechaSalidaDT = asDateTime(input.fechaSalida);
    const fechaContrato = input.fechaContrato || input.fechaEntrada.split('T')[0];

    // Transformar personas al formato PvPersona (usado por código MIR existente)
    const pvPersonas: PvPersona[] = input.personas.map(persona => ({
      rol: (persona.rol || 'VI') as 'VI' | 'CP' | 'CS' | 'TI',
      nombre: persona.nombre,
      apellido1: persona.apellido1,
      apellido2: persona.apellido2,
      tipoDocumento: persona.tipoDocumento,
      numeroDocumento: persona.numeroDocumento,
      soporteDocumento: persona.soporteDocumento,
      fechaNacimiento: persona.fechaNacimiento,
      nacionalidad: persona.nacionalidad,
      sexo: persona.sexo,
      direccion: {
        direccion: persona.direccion.direccion,
        direccionComplementaria: persona.direccion.direccionComplementaria,
        codigoMunicipio: persona.direccion.codigoMunicipio,
        nombreMunicipio: persona.direccion.nombreMunicipio,
        codigoPostal: persona.direccion.codigoPostal,
        pais: persona.direccion.pais,
      },
      telefono: persona.telefono,
      telefono2: persona.telefono2,
      correo: persona.correo,
      parentesco: persona.parentesco,
    }));

    // Crear contrato PV (Parte de Viajeros)
    const pvContrato: PvContrato = {
      referencia: input.referencia || `REF-${Date.now()}`,
      fechaContrato: fechaContrato,
      fechaEntrada: fechaEntradaDT,
      fechaSalida: fechaSalidaDT,
      numPersonas: input.numPersonas,
      numHabitaciones: input.numHabitaciones || 1,
      internet: input.internet || false,
      pago: {
        tipoPago: input.tipoPago || 'EFECT',
        fechaPago: input.fechaPago,
        medioPago: input.medioPago,
        titular: input.titular,
        caducidadTarjeta: input.caducidadTarjeta,
      },
    };

    // Crear solicitud PV (usa estructura existente)
    const pvSolicitud: PvSolicitud = {
      codigoEstablecimiento: codigoEstablecimiento,
      contrato: pvContrato,
      personas: pvPersonas,
    };

    // Generar XML PV usando código existente (NO duplicado)
    const xmlPV = buildPvXml(pvSolicitud);

    // Transformar personas al formato RhPersona (usado por código MIR existente)
    const rhPersonas: RhPersona[] = input.personas.map((persona, index) => ({
      rol: index === 0 ? 'TI' : 'VI', // Primera persona es titular, resto viajeros
      nombre: persona.nombre,
      apellido1: persona.apellido1,
      apellido2: persona.apellido2,
      tipoDocumento: persona.tipoDocumento,
      numeroDocumento: persona.numeroDocumento,
      soporteDocumento: persona.soporteDocumento,
      fechaNacimiento: persona.fechaNacimiento,
      nacionalidad: persona.nacionalidad,
      sexo: persona.sexo,
      direccion: {
        direccion: persona.direccion.direccion,
        direccionComplementaria: persona.direccion.direccionComplementaria,
        codigoPostal: persona.direccion.codigoPostal,
        pais: persona.direccion.pais,
        codigoMunicipio: persona.direccion.codigoMunicipio,
        nombreMunicipio: persona.direccion.nombreMunicipio,
      },
      telefono: persona.telefono,
      telefono2: persona.telefono2,
      correo: persona.correo,
      parentesco: persona.parentesco,
    }));

    // Crear contrato RH (Reserva de Hospedaje)
    const rhContrato: RhContrato = {
      referencia: input.referencia || `REF-${Date.now()}`,
      fechaContrato: fechaContrato,
      fechaEntrada: fechaEntradaDT,
      fechaSalida: fechaSalidaDT,
      numPersonas: input.numPersonas,
      numHabitaciones: input.numHabitaciones || 1,
      internet: input.internet || false,
      pago: {
        tipoPago: input.tipoPago || 'EFECT',
        fechaPago: input.fechaPago,
        medioPago: input.medioPago,
        titular: input.titular,
        caducidadTarjeta: input.caducidadTarjeta,
      },
    };

    // Crear solicitud RH (usa estructura existente)
    const rhSolicitud: RhSolicitud = {
      codigoEstablecimiento: codigoEstablecimiento,
      contrato: rhContrato,
      personas: rhPersonas,
    };

    // Generar XML RH usando código existente (NO duplicado)
    const xmlRH = buildRhXml(rhSolicitud);

    return { pv: xmlPV, rh: xmlRH };
  }

  /**
   * Envía el payload al MIR usando el cliente existente (NO duplicado)
   */
  async submit(
    payload: string | Buffer | { [key: string]: string | Buffer },
    ctx: AdapterContext
  ): Promise<SubmitResult> {
    try {
      // El payload debe ser un objeto con pv y rh (XML strings)
      if (typeof payload !== 'object' || !('pv' in payload) || !('rh' in payload)) {
        return this.createSubmitError(['Payload debe contener pv y rh']);
      }

      const xmlPV = typeof payload.pv === 'string' ? payload.pv : payload.pv.toString();
      const xmlRH = typeof payload.rh === 'string' ? payload.rh : payload.rh.toString();

      // Crear configuración del cliente MIR (usa estructura existente)
      const clientConfig: MinisterioConfig = {
        baseUrl: ctx.config.baseUrl || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
        username: ctx.config.username || '',
        password: ctx.config.password || '',
        codigoArrendador: ctx.config.codigoArrendador || '',
        aplicacion: ctx.config.aplicacion || 'Delfin_Check_in',
        simulacion: ctx.config.simulacion || false,
      };

      // Crear cliente MIR usando código existente (NO duplicado)
      const client = new MinisterioClientOfficial(clientConfig);

      // Enviar PV (Parte de Viajeros) usando código existente
      const resultadoPV = await client.altaPV({ xmlAlta: xmlPV });
      
      // Enviar RH (Reserva de Hospedaje) usando código existente
      const resultadoRH = await client.altaRH({ xmlAlta: xmlRH });

      // Combinar resultados
      const success = resultadoPV.ok && resultadoRH.ok;
      const errors: string[] = [];
      
      if (!resultadoPV.ok) {
        errors.push(`PV: ${resultadoPV.descripcion || 'Error desconocido'}`);
      }
      if (!resultadoRH.ok) {
        errors.push(`RH: ${resultadoRH.descripcion || 'Error desconocido'}`);
      }

      if (!success) {
        return this.createSubmitError(errors, { pv: resultadoPV, rh: resultadoRH });
      }

      return this.createSubmitSuccess(
        resultadoPV.codigoComunicacion || resultadoRH.codigoComunicacion,
        JSON.stringify({ pv: resultadoPV, rh: resultadoRH }),
        { pv: resultadoPV, rh: resultadoRH }
      );
    } catch (error) {
      return this.createSubmitError([
        error instanceof Error ? error.message : 'Error desconocido al enviar al MIR',
      ]);
    }
  }

  /**
   * Reglas de plazo: España requiere 24 horas desde la llegada
   */
  deadlineRules(checkinAt: Date): DeadlineRules {
    const dueAt = new Date(checkinAt);
    dueAt.setHours(dueAt.getHours() + 24); // 24 horas después

    const now = new Date();
    const hoursRemaining = Math.max(0, (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60));

    let severity: 'ok' | 'warn' | 'late' = 'ok';
    if (hoursRemaining < 0) {
      severity = 'late';
    } else if (hoursRemaining < 2) {
      severity = 'warn';
    }

    return {
      dueAt,
      severity,
      hoursRemaining,
    };
  }

  /**
   * Política de retención: España requiere mantener datos mínimo 12 meses
   */
  retentionPolicy(): RetentionPolicy {
    return {
      keepMonths: 12,
      description: 'España requiere conservar los datos de registro de viajeros durante 12 meses según la Ley 4/2015',
    };
  }

  /**
   * Campos requeridos para el formulario español
   */
  getRequiredFields(): FormField[] {
    return [
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        required: true,
        validation: { minLength: 1, maxLength: 50 },
      },
      {
        name: 'apellido1',
        label: 'Primer Apellido',
        type: 'text',
        required: true,
        validation: { minLength: 1, maxLength: 50 },
      },
      {
        name: 'apellido2',
        label: 'Segundo Apellido',
        type: 'text',
        required: false,
        validation: { maxLength: 50 },
      },
      {
        name: 'tipoDocumento',
        label: 'Tipo de Documento',
        type: 'select',
        required: false,
        options: [
          { value: 'NIF', label: 'NIF' },
          { value: 'NIE', label: 'NIE' },
          { value: 'PAS', label: 'Pasaporte' },
          { value: 'OTRO', label: 'Otro' },
        ],
      },
      {
        name: 'numeroDocumento',
        label: 'Número de Documento',
        type: 'text',
        required: false,
      },
      {
        name: 'fechaNacimiento',
        label: 'Fecha de Nacimiento',
        type: 'date',
        required: true,
      },
      {
        name: 'nacionalidad',
        label: 'Nacionalidad',
        type: 'select',
        required: false,
        helpText: 'Código ISO 3166-1 Alpha-3 (3 letras)',
      },
      {
        name: 'sexo',
        label: 'Sexo',
        type: 'select',
        required: false,
        options: [
          { value: 'M', label: 'Hombre' },
          { value: 'F', label: 'Mujer' },
        ],
      },
      {
        name: 'telefono',
        label: 'Teléfono',
        type: 'tel',
        required: false,
      },
      {
        name: 'correo',
        label: 'Correo Electrónico',
        type: 'email',
        required: false,
      },
      {
        name: 'direccion',
        label: 'Dirección',
        type: 'text',
        required: true,
      },
      {
        name: 'codigoPostal',
        label: 'Código Postal',
        type: 'text',
        required: true,
      },
      {
        name: 'pais',
        label: 'País',
        type: 'select',
        required: true,
        helpText: 'Código ISO 3166-1 Alpha-3 (3 letras)',
      },
      {
        name: 'codigoMunicipio',
        label: 'Código Municipio (INE)',
        type: 'text',
        required: false,
        helpText: '5 dígitos según INE (solo para España)',
        validation: { pattern: '^[0-9]{5}$' },
      },
    ];
  }

  /**
   * Reglas de validación para el formulario español
   */
  getValidationRules(): ValidationRules {
    return {
      nombre: { required: true },
      apellido1: { required: true },
      fechaNacimiento: { required: true },
      direccion: { required: true },
      codigoPostal: { required: true },
      pais: { required: true },
      codigoMunicipio: {
        custom: (value) => {
          if (value && !/^[0-9]{5}$/.test(value)) {
            return 'Código de municipio debe tener 5 dígitos';
          }
          return null;
        },
      },
      nacionalidad: {
        custom: (value) => {
          if (value && !/^[A-Z]{3}$/.test(value)) {
            return 'Nacionalidad debe ser código ISO 3166-1 Alpha-3 (3 letras)';
          }
          return null;
        },
      },
    };
  }

  /**
   * Textos legales para España
   */
  getLegalTexts(locale: string = 'es'): LegalTexts {
    return {
      privacyPolicy: 'Política de Privacidad según RGPD',
      termsOfService: 'Términos de Servicio',
      dataProtection: 'Protección de Datos Personales',
      complianceNotice: 'Este registro cumple con la Ley 4/2015 de Protección de Seguridad Ciudadana. Los datos se comunicarán al Ministerio del Interior de España en un plazo máximo de 24 horas desde la llegada.',
    };
  }
}

