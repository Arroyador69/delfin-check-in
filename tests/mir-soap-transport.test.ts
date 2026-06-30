import { describe, expect, it } from 'vitest';
import { getMirTlsCaBundle } from '@/lib/mir-tls-ca';
import { mirSoapPost } from '@/lib/mir-soap-transport';

describe('mir-tls-ca', () => {
  it('carga bundle con raíces + ACCOMP.pem', () => {
    const bundle = getMirTlsCaBundle();
    expect(bundle).toBeTruthy();
    expect(bundle).toContain('BEGIN CERTIFICATE');
    expect(bundle!.split('BEGIN CERTIFICATE').length).toBeGreaterThan(2);
  });
});

describe('mir-soap-transport', () => {
  it('conecta con hospedajes.ses.mir.es usando CA MIR (401 sin auth = TLS ok)', async () => {
    const res = await mirSoapPost(
      'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '""',
        'User-Agent': 'Delfin_Check_in/1.0-test',
      },
      '<?xml version="1.0"?><test/>',
      20000
    );
    // Sin credenciales el MIR responde 401, pero la conexión TLS debe completarse.
    expect([401, 403, 500]).toContain(res.status);
    expect(res.text).toBeDefined();
  }, 25000);
});
