import { describe, expect, it } from 'vitest';
import { parseEmailsFromCsvText } from '../src/lib/email-suppression';
import { extractBounceEmailsFromText } from '../src/lib/zoho-bounce-sync';
import { formatDailyReport } from '../src/lib/telegram';

describe('outreach bounce parse', () => {
  it('parsea CSV undelivered', () => {
    const emails = parseEmailsFromCsvText('email\nbad@casa.es\nok@otro.com');
    expect(emails).toContain('bad@casa.es');
    expect(emails).toContain('ok@otro.com');
  });

  it('extrae bounce de texto Zoho sin dominios propios', () => {
    const found = extractBounceEmailsFromText(
      'Delivery failed for usuario@alojamiento-falso.es',
      'from mailer-daemon@delfincheckin.com'
    );
    expect(found).toContain('usuario@alojamiento-falso.es');
    expect(found.some((e) => e.includes('delfincheckin.com'))).toBe(false);
  });
});

describe('telegram daily report outreach', () => {
  it('incluye métricas de captación', () => {
    const msg = formatDailyReport({
      newLeads: 0,
      totalLeads: 10,
      newLeadsList: [],
      outreach: {
        sent: 50,
        opened: 11,
        clicked: 0,
        bounced: 3,
        signedUp: 0,
        dailyCap: 50,
        signupGoal: 20,
      },
    });
    expect(msg).toMatch(/Captación propietarios/);
    expect(msg).toMatch(/Enviados: <b>50<\/b>/);
    expect(msg).toMatch(/Abiertos: <b>11<\/b>/);
    expect(msg).toMatch(/Undelivered\/bounce: <b>3<\/b>/);
    expect(msg).toMatch(/11:00/);
  });
});
