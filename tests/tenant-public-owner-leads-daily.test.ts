import { describe, expect, it } from 'vitest';
import {
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_DAILY_TARGET,
  PUBLIC_OWNER_LEADS_MIN_QUEUED,
  PUBLIC_OWNER_LEADS_CAMPAIGN,
  PUBLIC_OWNER_LEADS_WAVE_MAX,
  PUBLIC_OWNER_LEADS_WAVES_PER_DAY,
  PUBLIC_OWNER_LEADS_MIN_DELAY_MS,
  PUBLIC_OWNER_LEADS_TG_MORNING_SLOT,
  PUBLIC_OWNER_LEADS_TG_AFTERNOON_SLOT,
  PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
} from '../src/lib/public-owner-leads/constants';
import { isBlockedOutreachHost } from '../src/lib/public-owner-leads/blocked-hosts';
import { buildColdOutreachEmail } from '../src/lib/public-owner-leads/template';
import {
  waveFromSlot,
  osmOffsetFromSlot,
  isProgressTelegramSlot,
} from '../src/lib/public-owner-leads/wave-schedule';

describe('public-owner-leads daily campaign', () => {
  it('20 oleadas ×50 = tope 1000; cola 1000; delay ≥1.5s; meta 20; 3 Telegram/día', () => {
    expect(PUBLIC_OWNER_LEADS_WAVE_MAX).toBe(50);
    expect(PUBLIC_OWNER_LEADS_DAILY_TARGET).toBe(50);
    expect(PUBLIC_OWNER_LEADS_WAVES_PER_DAY).toBe(20);
    expect(PUBLIC_OWNER_LEADS_DAILY_HARD_CAP).toBe(1000);
    expect(PUBLIC_OWNER_LEADS_MIN_QUEUED).toBe(1000);
    expect(PUBLIC_OWNER_SIGNUPS_DAILY_GOAL).toBe(20);
    expect(PUBLIC_OWNER_LEADS_WAVE_MAX * PUBLIC_OWNER_LEADS_WAVES_PER_DAY).toBe(
      PUBLIC_OWNER_LEADS_DAILY_HARD_CAP
    );
    expect(PUBLIC_OWNER_LEADS_MIN_DELAY_MS).toBeGreaterThanOrEqual(1500);
    expect(PUBLIC_OWNER_LEADS_TG_MORNING_SLOT).toBe(8); // 12:00
    expect(PUBLIC_OWNER_LEADS_TG_AFTERNOON_SLOT).toBe(16); // 16:00
  });

  it('campaign key estable para UTM', () => {
    expect(PUBLIC_OWNER_LEADS_CAMPAIGN).toBe('public_owner_leads_es');
  });

  it('Telegram progreso solo en slots 12:00 y 16:00', () => {
    expect(isProgressTelegramSlot(8)).toBe('morning');
    expect(isProgressTelegramSlot(16)).toBe('afternoon');
    expect(isProgressTelegramSlot(0)).toBeNull();
    expect(isProgressTelegramSlot(10)).toBeNull();
  });

  it('slots mapean a franjas legacy', () => {
    expect(waveFromSlot(0)).toBe('morning');
    expect(waveFromSlot(5)).toBe('afternoon');
    expect(waveFromSlot(10)).toBe('evening');
    expect(waveFromSlot(19)).toBe('night');
    expect(osmOffsetFromSlot(7)).toBe(7);
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
    expect(mail.subject.toLowerCase()).toMatch(/prueb[aeo].*gratis|gratis/);
    expect(mail.html).toContain('Probar gratis ahora');
    expect(mail.html).toMatch(/minutito/i);
    expect(mail.html).toContain('Síguenos');
    expect(mail.html).toContain('Instagram');
    expect(mail.html).toContain('Facebook');
    expect(mail.html).toContain('YouTube');
    expect(mail.html).not.toMatch(/tenant|onboarding|cron|API/i);
    expect(mail.html).toContain('MIR');
    expect(mail.html).toMatch(/2€/);
    expect(mail.text).toContain('baja');
  });
});
