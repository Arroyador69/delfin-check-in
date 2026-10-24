import { describe, expect, it } from 'vitest';
import { isBlockedOutreachHost } from '../scripts/public-owner-leads/lib/blocked-hosts';
import {
  extractEmailsFromHtml,
  isPlausiblePublicEmail,
  normalizeUrl,
} from '../scripts/public-owner-leads/lib/emails';
import { buildColdOutreachEmail } from '../scripts/public-owner-leads/lib/template';

describe('public-owner-leads blocked hosts', () => {
  it('bloquea OTAs y redes', () => {
    expect(isBlockedOutreachHost('https://www.airbnb.com/rooms/1')).toBe(true);
    expect(isBlockedOutreachHost('https://www.booking.com/hotel/es/x.html')).toBe(true);
    expect(isBlockedOutreachHost('linkedin.com')).toBe(true);
    expect(isBlockedOutreachHost('https://instagram.com/foo')).toBe(true);
    expect(isBlockedOutreachHost('https://wa.me/34600000000')).toBe(true);
  });

  it('permite web propia', () => {
    expect(isBlockedOutreachHost('https://casa-rural-ejemplo.es/contacto')).toBe(false);
  });
});

describe('public-owner-leads email extract', () => {
  it('extrae mailto y texto', () => {
    const html = `
      <a href="mailto:Info@Casa.es">x</a>
      <p>Escríbenos a reservas@casa.es</p>
      <img src="x@y.png"/>
      <p>noreply@casa.es</p>
    `;
    const emails = extractEmailsFromHtml(html);
    expect(emails).toContain('info@casa.es');
    expect(emails).toContain('reservas@casa.es');
    expect(emails).not.toContain('noreply@casa.es');
  });

  it('filtra placeholders', () => {
    expect(isPlausiblePublicEmail('test@example.com')).toBe(false);
    expect(isPlausiblePublicEmail('hola@midominio.es')).toBe(true);
  });

  it('normaliza URL', () => {
    expect(normalizeUrl('midominio.es')).toBe('https://midominio.es');
  });
});

describe('cold template', () => {
  it('incluye origen, CTA y baja', () => {
    const mail = buildColdOutreachEmail({
      toEmail: 'a@b.es',
      domain: 'b.es',
      sourceUrl: 'https://b.es/contacto',
      optOutUrl: 'https://admin.delfincheckin.com/es/baja-outreach?e=x&s=y',
    });
    expect(mail.subject).toMatch(/prueba gratis/i);
    expect(mail.html).toContain('https://b.es/contacto');
    expect(mail.html).toContain('baja-outreach');
    expect(mail.text).toMatch(/web p[uú]blica/i);
  });
});
