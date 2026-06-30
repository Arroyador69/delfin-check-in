import { describe, expect, it, vi, afterEach } from 'vitest';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';

describe('MinisterioClientOfficial (simulación)', () => {
  it('altaPV devuelve ok con lote simulado', async () => {
    const client = new MinisterioClientOfficial({
      baseUrl: 'https://example.invalid',
      username: 'DEMO',
      password: 'DEMO',
      codigoArrendador: '0000000000',
      aplicacion: 'Delfin_Check_in',
      simulacion: true,
    });

    const res = await client.altaPV({ xmlAlta: '<xml />' });
    expect(res.ok).toBe(true);
    expect(res.codigo).toBe('0');
    expect(res.lote).toMatch(/^SIM-/);
  });

  it('altaRH devuelve ok con lote simulado', async () => {
    const client = new MinisterioClientOfficial({
      baseUrl: 'https://example.invalid',
      username: 'DEMO',
      password: 'DEMO',
      codigoArrendador: '0000000000',
      aplicacion: 'Delfin_Check_in',
      simulacion: true,
    });

    const res = await client.altaRH({ xmlAlta: '<xml />' });
    expect(res.ok).toBe(true);
    expect(res.codigo).toBe('0');
    expect(res.lote).toMatch(/^SIM-RH-/);
  });
});

describe('MinisterioClientOfficial (transporte SOAP)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('altaPV devuelve error controlado si el transporte HTTPS falla', async () => {
    const transport = await import('@/lib/mir-soap-transport');
    vi.spyOn(transport, 'mirSoapPost').mockRejectedValue(new TypeError('fetch failed'));

    const client = new MinisterioClientOfficial({
      baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: 'TESTUSER',
      password: 'TESTPASS',
      codigoArrendador: '0000000001',
      aplicacion: 'Delfin_Check_in',
      simulacion: false,
    });

    const res = await client.altaPV({ xmlAlta: '<solicitud />' });
    expect(res.ok).toBe(false);
    expect(res.codigo).toBe('NETWORK_ERROR');
    expect(res.descripcion).toMatch(/fetch failed|conectividad/i);
  });

  it('consultaCatalogo devuelve error controlado ante fallo TLS', async () => {
    const transport = await import('@/lib/mir-soap-transport');
    vi.spyOn(transport, 'mirSoapPost').mockRejectedValue(
      new Error('unable to verify the first certificate')
    );

    const client = new MinisterioClientOfficial({
      baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: 'TESTUSER',
      password: 'TESTPASS',
      codigoArrendador: '0000000001',
      aplicacion: 'Delfin_Check_in',
      simulacion: false,
    });

    const res = await client.consultaCatalogo({ catalogo: 'TIPOS_DOCUMENTO' });
    expect(res.ok).toBe(false);
    expect(res.codigo).toBe('NETWORK_ERROR');
    expect(res.elementos).toEqual([]);
  });
});

