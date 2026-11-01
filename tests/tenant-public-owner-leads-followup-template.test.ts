import { describe, expect, it } from 'vitest';
import { buildFollowUpOutreachEmail } from '../src/lib/public-owner-leads/template';

const base = {
  toEmail: 'owner@ejemplo.es',
  domain: 'ejemplo.es',
  sourceUrl: 'https://ejemplo.es/contacto',
  optOutUrl: 'https://admin.delfincheckin.com/es/baja-outreach?e=x&s=y',
  signupUrl: 'https://admin.delfincheckin.com/api/track/email-click?tid=1&url=x',
};

describe('buildFollowUpOutreachEmail', () => {
  it('fu_click: asunto con dominio, CTA registro y Plan Check-in 2€ (VR)', () => {
    const m = buildFollowUpOutreachEmail({ ...base, touch: 'fu_click' });
    expect(m.subject).toBe('ejemplo.es: te faltó un minuto');
    expect(m.text).toContain(base.signupUrl);
    expect(m.text).toMatch(/Plan Check-in \(~2€\/mes\)/);
    expect(m.text).toContain(base.optOutUrl);
    expect(m.html).toContain('baja-outreach');
  });

  it('fu_open y fu_silent: asuntos esperados', () => {
    expect(buildFollowUpOutreachEmail({ ...base, touch: 'fu_open' }).subject).toBe(
      'ejemplo.es: check-in SES en el móvil'
    );
    expect(buildFollowUpOutreachEmail({ ...base, touch: 'fu_silent' }).subject).toBe(
      'última nota sobre ejemplo.es'
    );
  });

  it('hotel: vosotros y sin empujar el precio de 2€', () => {
    const m = buildFollowUpOutreachEmail({ ...base, audience: 'hotel', touch: 'fu_click' });
    expect(m.subject).toBe('ejemplo.es: os faltó un minuto');
    expect(m.text).toMatch(/registraos/i);
    expect(m.text).not.toMatch(/2€\/mes \+ 2€/);
    expect(m.html).not.toMatch(/2€\/mes/);
  });

  it('es más corto que el cold (sin vídeo)', () => {
    const m = buildFollowUpOutreachEmail({ ...base, touch: 'fu_open' });
    expect(m.html).not.toContain('youtube');
  });
});
