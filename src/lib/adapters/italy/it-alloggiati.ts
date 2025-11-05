/**
 * Adapter para Italia - Sistema Alloggiati (Stub para futuro)
 * 
 * Este es un stub vacío que se implementará cuando se trabaje en Italia.
 * Por ahora solo define la estructura básica.
 */

import { BaseAdapter } from '../base/adapter';
import {
  CheckInPayload,
  ValidationResult,
  SubmitResult,
  DeadlineRules,
  RetentionPolicy,
  AdapterContext,
  FormField,
  ValidationRules,
  LegalTexts,
} from '../base/types';

export class ItalyAlloggiatiAdapter extends BaseAdapter {
  readonly key = 'it-alloggiati';
  readonly countryCode = 'IT';
  readonly name = 'Italia - Sistema Alloggiati (Pendiente de implementación)';

  validate(input: CheckInPayload): ValidationResult {
    return this.createValidationError('', 'Adapter de Italia aún no implementado');
  }

  async toAuthorityPayload(input: CheckInPayload, ctx: AdapterContext): Promise<string | Buffer | { [key: string]: string | Buffer }> {
    throw new Error('Adapter de Italia aún no implementado');
  }

  async submit(payload: string | Buffer | { [key: string]: string | Buffer }, ctx: AdapterContext): Promise<SubmitResult> {
    return this.createSubmitError(['Adapter de Italia aún no implementado']);
  }

  deadlineRules(checkinAt: Date): DeadlineRules {
    // Por ahora retorna reglas por defecto
    const dueAt = new Date(checkinAt);
    dueAt.setHours(dueAt.getHours() + 24);
    return {
      dueAt,
      severity: 'ok',
      hoursRemaining: 24,
    };
  }

  retentionPolicy(): RetentionPolicy {
    return {
      keepMonths: 12,
      description: 'Política de retención para Italia (pendiente de definir)',
    };
  }

  getRequiredFields(): FormField[] {
    return []; // Pendiente de implementar
  }

  getValidationRules(): ValidationRules {
    return {}; // Pendiente de implementar
  }

  getLegalTexts(locale: string = 'it'): LegalTexts {
    return {
      privacyPolicy: 'Política de Privacidad (Italia)',
      termsOfService: 'Términos de Servicio (Italia)',
      dataProtection: 'Protección de Datos Personales (Italia)',
      complianceNotice: 'Cumplimiento normativo italiano (pendiente de definir)',
    };
  }
}

