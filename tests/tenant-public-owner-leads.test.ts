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

  it('filtra placeholders y basura CSS', () => {
    expect(isPlausiblePublicEmail('test@example.com')).toBe(false);
    expect(isPlausiblePublicEmail('hola@midominio.es')).toBe(true);
    expect(isPlausiblePublicEmail('anim@ions.min.css')).toBe(false);
    expect(isPlausiblePublicEmail('api.wh@sapp.com')).toBe(false);
    expect(isPlausiblePublicEmail('formin@or-icons.min.css')).toBe(false);
    expect(isPlausiblePublicEmail('fa-map-loc@ion-.fa')).toBe(false);
    expect(isPlausiblePublicEmail('reservas@casarural.com')).toBe(true);
    expect(isPlausiblePublicEmail('www.avir@o.com')).toBe(false);
    expect(isPlausiblePublicEmail('st@s.wp.com')).toBe(false);
    expect(isPlausiblePublicEmail('il@ina.es')).toBe(false);
    expect(isPlausiblePublicEmail('reservascasarellos@gmail.com')).toBe(true);
    expect(isPlausiblePublicEmail('whatsapp-image-2023-06-14-@-15.24.05.jpeg')).toBe(false);
    expect(isPlausiblePublicEmail('st@e.currentimage.alt')).toBe(false);
    expect(isPlausiblePublicEmail('navig@ion-branding-flex.min.css')).toBe(false);
    expect(isPlausiblePublicEmail('m@erial-design-iconic-font.min.css')).toBe(false);
    expect(isPlausiblePublicEmail('window.loc@ion.href')).toBe(false);
    expect(isPlausiblePublicEmail('n@uraleza.disfruta')).toBe(false);
    expect(isPlausiblePublicEmail('des@ascoschiclana.org')).toBe(true); // sintaxis ok; score lo mata sin dominio web
  });

  it('no extrae falsos de CSS', () => {
    const html = `
      <link href="forminator-icons.min.css"/>
      <p class="fa-map-location">x</p>
      <a href="mailto:reservas@casarural.com">ok</a>
      <style>.anim@ions.min.css{}</style>
    `;
    const emails = extractEmailsFromHtml(html);
    expect(emails).toEqual(['reservas@casarural.com']);
  });

  it('normaliza URL', () => {
    expect(normalizeUrl('midominio.es')).toBe('https://midominio.es');
  });
});

describe('cold template', () => {
  it('incluye origen, CTA, redes y baja', () => {
    const mail = buildColdOutreachEmail({
      toEmail: 'a@b.es',
      domain: 'b.es',
      sourceUrl: 'https://b.es/contacto',
      optOutUrl: 'https://admin.delfincheckin.com/es/baja-outreach?e=x&s=y',
    });
    expect(mail.subject).toMatch(/parte de viajeros MIR/i);
    expect(mail.subject).toMatch(/gratis/i);
    expect(mail.html).toContain('https://b.es/contacto');
    expect(mail.html).toContain('baja-outreach');
    expect(mail.text).toMatch(/web p[uú]blica/i);
    expect(mail.text).toMatch(/Instagram:/);
    expect(mail.text).toMatch(/Facebook:/);
    expect(mail.text).toMatch(/X:/);
    expect(mail.text).toMatch(/YouTube:/);
    expect(mail.html).toContain('Síguenos');
    expect(mail.html).toContain('sH4Yv5t5hdI');
    expect(mail.html).toMatch(/Ver vídeo/i);
    expect(mail.text).toMatch(/youtube\.com\/watch\?v=sH4Yv5t5hdI/);
  });
});
