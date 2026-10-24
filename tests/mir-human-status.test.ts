import { describe, expect, it } from 'vitest';
import { resolveMirHumanStatus } from '@/lib/mir-human-status';

describe('resolveMirHumanStatus', () => {
  it('marca OK si está confirmado', () => {
    expect(resolveMirHumanStatus({ estado: 'confirmado' }).kind).toBe('ok');
  });

  it('marca OK con codigoComunicacion', () => {
    expect(
      resolveMirHumanStatus({ mirStatus: { codigoComunicacion: 'ABC-1' } }).kind
    ).toBe('ok');
  });

  it('marca Error con mensaje y acción', () => {
    const s = resolveMirHumanStatus({ error: 'XML inválido' });
    expect(s.kind).toBe('error');
    expect(s.actionKey).toBe('retryOrSupport');
    expect(s.detail).toBe('XML inválido');
  });

  it('marca Pendiente si solo hay lote enviado', () => {
    const s = resolveMirHumanStatus({ estado: 'enviado', mirStatus: { lote: 'lote-1' } });
    expect(s.kind).toBe('pendiente');
    expect(s.actionKey).toBe('waitConfirm');
  });

  it('marca Pendiente sin datos y pide formulario', () => {
    const s = resolveMirHumanStatus({});
    expect(s.kind).toBe('pendiente');
    expect(s.actionKey).toBe('sendGuestForm');
  });
});
