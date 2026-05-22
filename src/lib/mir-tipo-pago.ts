/**
 * Resolución y normalización de tipoPago según catálogo MIR (RD 933 / hospedajes).
 */

const MIR_PAGO_BY_KEYWORD: Array<[RegExp, string]> = [
  [/efect/i, 'EFECT'],
  [/tarj/i, 'TARJT'],
  [/trans/i, 'TRANS'],
  [/plat/i, 'PLATF'],
  [/movil|móvil/i, 'MOVIL'],
  [/cheq|treg/i, 'TREG'],
  [/dest/i, 'DESTI'],
];

const MIR_PAGO_ALIASES: Record<string, string> = {
  EFECTIVO: 'EFECT',
  EFECT: 'EFECT',
  TARJETA: 'TARJT',
  TARJ: 'TARJT',
  TARJT: 'TARJT',
  CARD: 'TARJT',
  PLATAFORMA: 'PLATF',
  PLATF: 'PLATF',
  TRANSFERENCIA: 'TRANS',
  TRANSF: 'TRANS',
  TRANS: 'TRANS',
  MOVIL: 'MOVIL',
  CHEQUE: 'TREG',
  TREG: 'TREG',
  DESTINO: 'DESTI',
  DESTI: 'DESTI',
  OTRO: 'OTRO',
};

function readString(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

function pickFromObject(obj: Record<string, unknown>): string | undefined {
  const contrato = obj.contrato as Record<string, unknown> | undefined;
  const pago = (obj.pago ?? contrato?.pago) as Record<string, unknown> | undefined;
  const comunicaciones = obj.comunicaciones as Array<Record<string, unknown>> | undefined;
  const firstCom = comunicaciones?.[0];
  const comContrato = firstCom?.contrato as Record<string, unknown> | undefined;
  const comPago = comContrato?.pago as Record<string, unknown> | undefined;

  const candidates = [
    obj.tipoPago,
    obj.tipoPagoCode,
    obj.tipoPagoLabel,
    pago?.tipoPago,
    pago?.tipoPagoCode,
    pago?.tipo,
    contrato?.tipoPago,
    contrato?.tipoPagoCode,
    contrato?.tipoPagoLabel,
    (contrato?.pago as Record<string, unknown> | undefined)?.tipoPago,
    (contrato?.pago as Record<string, unknown> | undefined)?.tipoPagoCode,
    comContrato?.tipoPago,
    comContrato?.tipoPagoCode,
    comContrato?.tipoPagoLabel,
    comPago?.tipoPago,
    comPago?.tipoPagoCode,
    comPago?.tipo,
  ];

  for (const c of candidates) {
    const s = readString(c);
    if (s) return s;
  }
  return undefined;
}

/** Busca tipoPago en cualquier forma habitual del JSON o del campo data de guest_registrations. */
export function extractTipoPagoRaw(source: unknown): string | undefined {
  if (source == null) return undefined;
  if (typeof source === 'string') {
    try {
      return extractTipoPagoRaw(JSON.parse(source));
    } catch {
      return readString(source);
    }
  }
  if (typeof source !== 'object') return undefined;
  return pickFromObject(source as Record<string, unknown>);
}

/** Convierte etiquetas/códigos legacy al código MIR (máx. 5 caracteres). */
export function normalizeMirTipoPago(raw?: string): string {
  const input = readString(raw);
  if (!input) return 'EFECT';

  const upper = input.toUpperCase();
  if (MIR_PAGO_ALIASES[upper]) return MIR_PAGO_ALIASES[upper];

  for (const [re, code] of MIR_PAGO_BY_KEYWORD) {
    if (re.test(input)) return code;
  }

  return upper.length <= 5 ? upper : 'OTRO';
}

/** Resuelve y normaliza; devuelve EFECT si no hay dato (válido para MIR). */
export function resolveMirTipoPago(sources: unknown[]): string {
  for (const src of sources) {
    const raw = extractTipoPagoRaw(src);
    if (raw) return normalizeMirTipoPago(raw);
  }
  return 'EFECT';
}
