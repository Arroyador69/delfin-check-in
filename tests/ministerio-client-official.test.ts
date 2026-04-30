import { describe, expect, it } from 'vitest';
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

