import { describe, expect, it } from 'vitest';
import {
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_DAILY_TARGET,
  PUBLIC_OWNER_LEADS_CAMPAIGN,
} from '../src/lib/public-owner-leads/constants';
import { isBlockedOutreachHost } from '../src/lib/public-owner-leads/blocked-hosts';
import { buildColdOutreachEmail } from '../src/lib/public-owner-leads/template';

describe('public-owner-leads daily campaign', () => {
  it('objetivo diario es 50', () => {
    expect(PUBLIC_OWNER_LEADS_DAILY_TARGET).toBe(50);
    expect(PUBLIC_OWNER_LEADS_DAILY_HARD_CAP).toBe(50);
  });

  it('campaign key estable para UTM', () => {
    expect(PUBLIC_OWNER_LEADS_CAMPAIGN).toBe('public_owner_leads_es');
  });

  it('bloquea OTAs y permite web propia', () => {
    expect(isBlockedOutreachHost('https://www.booking.com/hotel/es/x.html')).toBe(true);
    expect(isBlockedOutreachHost('https://casa-rural-andalucia.es/contacto')).toBe(false);
  });

  it('plantilla vende prueba gratis MIR', () => {
    const mail = buildColdOutreachEmail({
      toEmail: 'owner@ejemplo.es',
      domain: 'ejemplo.es',
      sourceUrl: 'https://ejemplo.es/contacto',
      optOutUrl: 'https://admin.delfincheckin.com/es/baja-outreach?e=x&s=y',
      signupUrl: 'https://delfincheckin.com/?utm_campaign=public_owner_leads_es',
    });
    expect(mail.subject.toLowerCase()).toContain('prueba gratis');
    expect(mail.html).toContain('Probar gratis');
    expect(mail.html).toContain('MIR');
    expect(mail.text).toContain('baja');
  });
});
