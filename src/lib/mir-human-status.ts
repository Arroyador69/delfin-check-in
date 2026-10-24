/**
 * Estados MIR legibles para el admin (hallazgo MiroFish #1).
 * Tres valores humanos: OK | Error | Pendiente.
 */

export type MirHumanKind = 'ok' | 'error' | 'pendiente';

export type MirHumanStatusInput = {
  estado?: string | null;
  codigoEstado?: string | null;
  mirStatus?: {
    estado?: string | null;
    lote?: string | null;
    error?: string | null;
    codigoComunicacion?: string | null;
    fechaEnvio?: string | null;
  } | null;
  error?: string | null;
};

export type MirHumanStatus = {
  kind: MirHumanKind;
  labelKey: MirHumanKind;
  actionKey: 'retryOrSupport' | 'sendGuestForm' | 'waitConfirm' | null;
  detail?: string | null;
};

/**
 * Regla producto:
 * - OK = confirmado (código 1 o codigoComunicacion sin error)
 * - Error = error / anulado / código 5–6 / mensaje de error
 * - Pendiente = resto (sin envío, enviado sin confirmar, código 4)
 */
export function resolveMirHumanStatus(input: MirHumanStatusInput): MirHumanStatus {
  const mir = input.mirStatus || {};
  const rawError = (input.error || mir.error || '').toString().trim();
  const estadoRaw = (input.estado || mir.estado || '').toString().trim().toLowerCase();
  const codigo = (input.codigoEstado || '').toString().trim();
  const hasCodigoComunicacion = Boolean(mir.codigoComunicacion);

  if (
    rawError ||
    estadoRaw === 'error' ||
    estadoRaw === 'anulado' ||
    estadoRaw === 'failed' ||
    codigo === '5' ||
    codigo === '6'
  ) {
    return {
      kind: 'error',
      labelKey: 'error',
      actionKey: 'retryOrSupport',
      detail: rawError || null,
    };
  }

  if (estadoRaw === 'confirmado' || estadoRaw === 'ok' || codigo === '1' || hasCodigoComunicacion) {
    return {
      kind: 'ok',
      labelKey: 'ok',
      actionKey: null,
      detail: null,
    };
  }

  if (estadoRaw === 'enviado' || mir.lote || codigo === '4') {
    return {
      kind: 'pendiente',
      labelKey: 'pendiente',
      actionKey: 'waitConfirm',
      detail: null,
    };
  }

  return {
    kind: 'pendiente',
    labelKey: 'pendiente',
    actionKey: 'sendGuestForm',
    detail: null,
  };
}
