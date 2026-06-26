/**
 * Normativa MIR (SES-Hospedajes) — campo soporteDocumento en PV (personaHospedajeType).
 *
 * Obligatorio para documentos de identidad españoles con número de soporte:
 * - NIF (DNI): código alfanumérico del reverso del DNI
 * - NIE: número de soporte de la tarjeta NIE
 *
 * No aplica a pasaporte ni otros tipos (viajeros extranjeros con PAS/OTRO).
 * @see GUIA_PRODUCCION_MIR.md — NIF/NIE → soporteDocumento obligatorios
 */

export type MirSoporteDocumentoKind = 'NIF' | 'NIE';

export function mirSoporteDocumentoKind(
  tipoDocumento?: string | null
): MirSoporteDocumentoKind | null {
  const t = String(tipoDocumento || '').trim().toUpperCase();
  if (t === 'NIF') return 'NIF';
  if (t === 'NIE') return 'NIE';
  return null;
}

export function mirRequiresSoporteDocumento(tipoDocumento?: string | null): boolean {
  return mirSoporteDocumentoKind(tipoDocumento) !== null;
}

/** Valor listo para XML MIR; undefined si no aplica o falta dato obligatorio. */
export function resolveSoporteDocumentoForMir(
  tipoDocumento?: string | null,
  soporte?: string | null,
  numeroDocumento?: string | null
): string | undefined {
  if (!mirRequiresSoporteDocumento(tipoDocumento)) return undefined;
  if (!String(numeroDocumento || '').trim()) return undefined;
  const normalized = String(soporte || '').trim().toUpperCase();
  return normalized || undefined;
}

function soporteValidationMessage(kind: MirSoporteDocumentoKind, code: 'required' | 'invalid'): string {
  if (kind === 'NIF') {
    return code === 'required'
      ? 'Número de soporte del DNI obligatorio (código del reverso del documento, normativa MIR)'
      : 'Número de soporte del DNI inválido (2-20 caracteres alfanuméricos)';
  }
  return code === 'required'
    ? 'Número de soporte del NIE obligatorio (impreso en la tarjeta NIE, normativa MIR)'
    : 'Número de soporte del NIE inválido (2-20 caracteres alfanuméricos)';
}

export function validateMirSoporteDocumento(
  tipoDocumento?: string | null,
  soporte?: string | null,
  numeroDocumento?: string | null
): string | null {
  const kind = mirSoporteDocumentoKind(tipoDocumento);
  if (!kind || !String(numeroDocumento || '').trim()) return null;

  const s = String(soporte || '').trim();
  if (!s) return soporteValidationMessage(kind, 'required');

  const normalized = s.toUpperCase();
  if (normalized.length < 2 || normalized.length > 20 || !/^[A-Z0-9]+$/.test(normalized)) {
    return soporteValidationMessage(kind, 'invalid');
  }
  return null;
}
