/**
 * Clase base abstracta para adapters de diferentes países
 * Cada país implementa su propia lógica pero sigue esta interfaz común
 */

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
} from './types';

export abstract class BaseAdapter {
  /**
   * Identificador único del adapter (ej: 'es-hospederias', 'it-alloggiati')
   */
  abstract readonly key: string;

  /**
   * Código ISO del país (ej: 'ES', 'IT', 'FR')
   */
  abstract readonly countryCode: string;

  /**
   * Nombre del adapter para mostrar
   */
  abstract readonly name: string;

  /**
   * Valida el payload de check-in antes de procesarlo
   */
  abstract validate(input: CheckInPayload): ValidationResult;

  /**
   * Transforma el payload genérico al formato específico de la autoridad
   * Retorna el formato que se enviará (XML, CSV, JSON, etc.)
   */
  abstract toAuthorityPayload(input: CheckInPayload, ctx: AdapterContext): Promise<string | Buffer | { [key: string]: string | Buffer }>;

  /**
   * Envía el payload a la autoridad oficial
   */
  abstract submit(payload: string | Buffer | { [key: string]: string | Buffer }, ctx: AdapterContext): Promise<SubmitResult>;

  /**
   * Calcula las reglas de plazo según el país
   * (ej: España requiere 24h, Italia puede requerir 48h, etc.)
   */
  abstract deadlineRules(checkinAt: Date): DeadlineRules;

  /**
   * Retorna la política de retención de datos según el país
   */
  abstract retentionPolicy(): RetentionPolicy;

  /**
   * Retorna los campos requeridos para el formulario según el país
   */
  abstract getRequiredFields(): FormField[];

  /**
   * Retorna las reglas de validación para el formulario
   */
  abstract getValidationRules(): ValidationRules;

  /**
   * Retorna los textos legales específicos del país
   */
  abstract getLegalTexts(locale?: string): LegalTexts;

  /**
   * Método helper para crear errores de validación
   */
  protected createValidationError(field: string, message: string, code?: string): ValidationResult {
    return {
      valid: false,
      errors: [{ field, message, code }],
    };
  }

  /**
   * Método helper para crear resultado de validación válido
   */
  protected createValidationSuccess(): ValidationResult {
    return {
      valid: true,
      errors: [],
    };
  }

  /**
   * Método helper para crear resultado de envío exitoso
   */
  protected createSubmitSuccess(reference?: string, receipt?: string, rawResponse?: any): SubmitResult {
    return {
      success: true,
      reference,
      receipt,
      rawResponse,
    };
  }

  /**
   * Método helper para crear resultado de envío fallido
   */
  protected createSubmitError(errors: string[], rawResponse?: any): SubmitResult {
    return {
      success: false,
      errors,
      rawResponse,
    };
  }
}

