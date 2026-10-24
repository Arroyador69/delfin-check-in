import { describe, expect, it } from 'vitest';
import {
  isInactiveTenantStatus,
  isSmtpHardBounceError,
  parseEmailsFromCsvText,
} from '@/lib/email-suppression';
import { extractBounceEmailsFromText } from '@/lib/zoho-bounce-sync';

describe('email-suppression helpers', () => {
  it('parseEmailsFromCsvText lee columna email y líneas sueltas', () => {
    const csv = `email,status\nbad@example.com,undelivered\nok@other.org,fail`;
    expect(parseEmailsFromCsvText(csv)).toEqual(['bad@example.com', 'ok@other.org']);
    expect(parseEmailsFromCsvText('solo@dominio.es')).toEqual(['solo@dominio.es']);
  });

  it('isSmtpHardBounceError detecta 550', () => {
    expect(isSmtpHardBounceError({ message: 'fail', responseCode: 550 })).toBe(true);
    expect(isSmtpHardBounceError(new Error('Mailbox unavailable'))).toBe(true);
    expect(isSmtpHardBounceError(new Error('temporary greylist'))).toBe(false);
  });

  it('isInactiveTenantStatus', () => {
    expect(isInactiveTenantStatus('cancelled')).toBe(true);
    expect(isInactiveTenantStatus('SUSPENDED')).toBe(true);
    expect(isInactiveTenantStatus('active')).toBe(false);
  });

  it('extractBounceEmailsFromText excluye mailer-daemon', () => {
    const emails = extractBounceEmailsFromText(
      'Mail Delivery Failed',
      'mailer-daemon@zoho.eu',
      'Final-Recipient: rfc822; dest@hotel-fail.es'
    );
    expect(emails).toContain('dest@hotel-fail.es');
    expect(emails.some((e) => e.includes('mailer-daemon'))).toBe(false);
  });
});
