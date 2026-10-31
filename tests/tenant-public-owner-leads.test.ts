import { describe, expect, it } from 'vitest';
import { isBlockedOutreachHost, normalizeUrl } from '../src/lib/public-owner-leads/extract-web';
import { buildColdOutreachEmail } from '../src/lib/public-owner-leads/template';

describe('extract-web helpers', () => {
  it('bloquea OTAs', () => {
    expect(isBlockedOutreachHost('https://www.booking.com/hotel/es/x.html')).toBe(true);
    expect(isBlockedOutreachHost('https://www.airbnb.es/rooms/1')).toBe(true);
  });

  it('permite web propia', () => {
    expect(isBlockedOutreachHost('https://casa-rural-ejemplo.es/contacto')).toBe(false);
  });

  it('normaliza URL', () => {
    expect(normalizeUrl('midominio.es')).toBe('https://midominio.es');
  });
});

describe('cold template', () => {
  it('valor + CTA grande + redes TikTok; sin origen ni listas compradas', () => {
    const mail = buildColdOutreachEmail({
      toEmail: 'a@b.es',
      domain: 'b.es',
      sourceUrl: 'https://b.es/contacto',
      optOutUrl: 'https://admin.delfincheckin.com/es/baja-outreach?e=x&s=y',
    });
    expect(mail.subject).toMatch(/reg[ií]strate|minuto|gratis|check-in/i);
    expect(mail.html + mail.text).toMatch(/SES Hospedajes/i);
    // No quemar confianza: no mencionar de dónde salió el email
    expect(mail.html).not.toContain('https://b.es/contacto');
    expect(mail.html).not.toMatch(/listas compradas/i);
    expect(mail.text).not.toMatch(/listas compradas|publicado en/i);
    expect(mail.html).toContain('baja-outreach');
    expect(mail.html).toMatch(/Reg[ií]strate gratis|1 minuto/i);
    expect(mail.html).toMatch(/sin tarjeta/i);
    expect(mail.html).toMatch(/Reservas directas|comisiones/i);
    expect(mail.html).toMatch(/limpieza/i);
    expect(mail.text).toMatch(/Instagram:/);
    expect(mail.text).toMatch(/Facebook:/);
    expect(mail.text).toMatch(/TikTok:/);
    expect(mail.text).toMatch(/YouTube:/);
    expect(mail.html).toContain('tiktok.com/@delfincheckin');
    expect(mail.html).toContain('profile.php?id=61586844961934');
    expect(mail.html).toContain('Síguenos');
    expect(mail.html).toContain('sH4Yv5t5hdI');
    expect(mail.html).toMatch(/Ver vídeo/i);
  });
});
