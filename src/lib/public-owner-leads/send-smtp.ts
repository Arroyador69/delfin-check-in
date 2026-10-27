/**
 * Envío cold outreach — proveedores:
 * 1) Resend (RESEND_API_KEY) — recomendado
 * 2) Brevo (BREVO_API_KEY)
 * 3) SMTP genérico (SMTP_*) — emergencia; Zoho Mail NO es apto para bulk
 *
 * Zoho usage policy prohíbe bulk/marketing en Zoho Mail.
 * @see https://www.zoho.com/mail/help/usage-policy.html
 */

import nodemailer from 'nodemailer';

export type OutreachProviderName = 'resend' | 'brevo' | 'smtp' | 'none';

export type OutreachProviderInfo = {
  provider: OutreachProviderName;
  from: string;
  zohoSmtp: boolean;
  /** true si el envío va por Zoho Mail (riesgo de bloqueo por rate/policy) */
  zohoRisk: boolean;
  hint: string;
};

function env(name: string): string {
  return String(process.env[name] || '').trim();
}

export function outreachFromAddress(): string {
  return (
    env('SMTP_FROM_OUTREACH') ||
    env('RESEND_FROM') ||
    env('BREVO_FROM') ||
    env('SMTP_FROM') ||
    env('SMTP_USER') ||
    'Delfín Check-in <hola@delfincheckin.com>'
  );
}

function smtpHost(): string {
  return env('SMTP_HOST').toLowerCase();
}

export function isZohoSmtpHost(host = smtpHost()): boolean {
  return host.includes('zoho.');
}

/**
 * Resolución de proveedor. Override: OUTREACH_PROVIDER=resend|brevo|smtp|auto
 */
export function resolveOutreachProvider(): OutreachProviderName {
  const forced = env('OUTREACH_PROVIDER').toLowerCase();
  if (forced === 'resend' || forced === 'brevo' || forced === 'smtp') {
    if (forced === 'resend' && !env('RESEND_API_KEY')) return 'none';
    if (forced === 'brevo' && !env('BREVO_API_KEY')) return 'none';
    if (forced === 'smtp' && (!smtpHost() || !env('SMTP_USER'))) return 'none';
    return forced;
  }
  // auto
  if (env('RESEND_API_KEY')) return 'resend';
  if (env('BREVO_API_KEY')) return 'brevo';
  if (smtpHost() && env('SMTP_USER') && (env('SMTP_PASS') || env('SMTP_PASSWORD'))) {
    return 'smtp';
  }
  return 'none';
}

export function getOutreachProviderInfo(): OutreachProviderInfo {
  const provider = resolveOutreachProvider();
  const from = outreachFromAddress();
  const zohoSmtp = provider === 'smtp' && isZohoSmtpHost();
  const allowZoho = env('OUTREACH_ALLOW_ZOHO') === '1';

  if (provider === 'none') {
    return {
      provider,
      from,
      zohoSmtp: false,
      zohoRisk: true,
      hint: 'Configura RESEND_API_KEY o BREVO_API_KEY en Vercel (recomendado). SMTP Zoho no sirve para cold email.',
    };
  }
  if (zohoSmtp && !allowZoho) {
    return {
      provider,
      from,
      zohoSmtp: true,
      zohoRisk: true,
      hint: 'Envío por Zoho Mail (riesgo bloqueo). Pon RESEND_API_KEY/BREVO_API_KEY o OUTREACH_ALLOW_ZOHO=1 solo emergencia.',
    };
  }
  if (zohoSmtp) {
    return {
      provider,
      from,
      zohoSmtp: true,
      zohoRisk: true,
      hint: 'OUTREACH_ALLOW_ZOHO=1 activo — reduce volumen; migra a Resend/Brevo cuanto antes.',
    };
  }
  return {
    provider,
    from,
    zohoSmtp: false,
    zohoRisk: false,
    hint:
      provider === 'resend'
        ? 'Outreach vía Resend (OK para volumen controlado).'
        : provider === 'brevo'
          ? 'Outreach vía Brevo (OK para volumen controlado).'
          : 'Outreach vía SMTP no-Zoho.',
  };
}

function listUnsubHeaders(optOutUrl?: string): Record<string, string> {
  const listUnsub = optOutUrl
    ? `<${optOutUrl}>, <mailto:soporte@delfincheckin.com?subject=baja>`
    : `<mailto:soporte@delfincheckin.com?subject=baja>`;
  return {
    'List-Unsubscribe': listUnsub,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Delfin-Campaign': 'public-owner-leads',
  };
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  optOutUrl?: string;
}): Promise<{ messageId?: string; provider: 'resend' }> {
  const key = env('RESEND_API_KEY');
  if (!key) throw new Error('RESEND_API_KEY no configurada');

  const headers = listUnsubHeaders(opts.optOutUrl);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: outreachFromAddress(),
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      headers,
      tags: [{ name: 'campaign', value: 'public-owner-leads' }],
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };
  if (!res.ok) {
    const msg = body.message || body.name || `Resend HTTP ${res.status}`;
    const err = new Error(msg) as Error & { retryable?: boolean };
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  return { messageId: body.id, provider: 'resend' };
}

async function sendViaBrevo(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  optOutUrl?: string;
}): Promise<{ messageId?: string; provider: 'brevo' }> {
  const key = env('BREVO_API_KEY');
  if (!key) throw new Error('BREVO_API_KEY no configurada');

  const fromRaw = outreachFromAddress();
  const m = fromRaw.match(/^(.*?)\s*<([^>]+)>$/);
  const senderName = m ? m[1].replace(/^["']|["']$/g, '').trim() : 'Delfín Check-in';
  const senderEmail = m ? m[2].trim() : fromRaw;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName || 'Delfín Check-in', email: senderEmail },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
      textContent: opts.text,
      headers: listUnsubHeaders(opts.optOutUrl),
      tags: ['public-owner-leads'],
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    messageId?: string;
    message?: string;
  };
  if (!res.ok) {
    const msg = body.message || `Brevo HTTP ${res.status}`;
    const err = new Error(msg) as Error & { retryable?: boolean };
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  return { messageId: body.messageId, provider: 'brevo' };
}

/** SMTP transport (preview scripts / fallback). Prefer Resend/Brevo para cold. */
export function createOutreachTransport() {
  const host = env('SMTP_HOST');
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASS') || env('SMTP_PASSWORD');
  const port = parseInt(env('SMTP_PORT') || '587', 10);
  const secure = env('SMTP_SECURE') === 'true';

  if (!host || !user || !pass) {
    const missing = [];
    if (!host) missing.push('SMTP_HOST');
    if (!user) missing.push('SMTP_USER');
    if (!pass) missing.push('SMTP_PASS o SMTP_PASSWORD');
    throw new Error(`SMTP no configurado. Faltan: ${missing.join(', ')}`);
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  optOutUrl?: string;
}): Promise<{ messageId?: string; provider: 'smtp' }> {
  if (isZohoSmtpHost() && env('OUTREACH_ALLOW_ZOHO') !== '1') {
    // Permitir si no hay ESP, pero avisar fuerte en logs — no tumbar el día sin keys.
    // Si OUTREACH_BLOCK_ZOHO=1 → hard fail (migración completa).
    if (env('OUTREACH_BLOCK_ZOHO') === '1') {
      throw new Error(
        'Outreach bloqueado en Zoho Mail (OUTREACH_BLOCK_ZOHO=1). Configura RESEND_API_KEY o BREVO_API_KEY.'
      );
    }
    console.warn(
      '[outreach] WARNING: enviando cold email por Zoho Mail — riesgo de bloqueo (usage policy). Migra a Resend/Brevo.'
    );
  }

  const transport = createOutreachTransport();
  const info = await transport.sendMail({
    from: outreachFromAddress(),
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    headers: listUnsubHeaders(opts.optOutUrl),
  });
  return { messageId: info.messageId, provider: 'smtp' };
}

export async function sendOutreachMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  optOutUrl?: string;
}): Promise<{ messageId?: string; provider: OutreachProviderName }> {
  const provider = resolveOutreachProvider();
  if (provider === 'none') {
    throw new Error(
      'Sin proveedor de outreach. Configura RESEND_API_KEY, BREVO_API_KEY o SMTP_* en Vercel.'
    );
  }
  if (provider === 'resend') return sendViaResend(opts);
  if (provider === 'brevo') return sendViaBrevo(opts);
  return sendViaSmtp(opts);
}
