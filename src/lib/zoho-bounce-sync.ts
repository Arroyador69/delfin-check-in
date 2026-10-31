/**
 * Sync de bounces / undelivered desde Zoho Mail API (EU).
 *
 * Flujo:
 * 1. Refresh token → access token (accounts.zoho.eu)
 * 2. GET /api/accounts → accountId
 * 3. GET /api/accounts/{accountId}/folders → folderId de Undelivered (o similar)
 * 4. GET /api/accounts/{accountId}/messages/view?folderId=... → listar
 * 5. Extraer emails destinatarios fallidos de subject/from/to/snippet y upsert suppression
 *
 * Si la carpeta no existe o el scope OAuth no permite lectura, el cron sigue
 * pudiendo importar CSV o auto-suppress vía SMTP 550.
 */

import {
  normalizeSuppressionEmail,
  upsertEmailSuppression,
} from '@/lib/email-suppression';
import { applyOutreachBounceEmails } from '@/lib/public-owner-leads/apply-bounces';

const ZOHO_ACCOUNTS_TOKEN = 'https://accounts.zoho.eu/oauth/v2/token';
const ZOHO_MAIL_API = (process.env.ZOHO_MAIL_API_URL || 'https://mail.zoho.eu/api/accounts').replace(
  /\/+$/,
  ''
);

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const OUR_DOMAINS = new Set(
  [
    'delfincheckin.com',
    'mail.delfincheckin.com',
    String(process.env.ZOHO_FROM_EMAIL || '')
      .split('@')[1]
      ?.toLowerCase(),
    String(process.env.SMTP_FROM_EMAIL || '')
      .split('@')[1]
      ?.toLowerCase(),
    String(process.env.SMTP_USER || '')
      .split('@')[1]
      ?.toLowerCase(),
  ].filter(Boolean) as string[]
);

export type ZohoBounceSyncResult = {
  ok: boolean;
  accessTokenOk: boolean;
  accountId: string | null;
  undeliveredFolderId: string | null;
  messagesScanned: number;
  emailsFound: number;
  inserted: number;
  skippedExisting: number;
  leadsMarked?: number;
  error?: string;
  note?: string;
};

async function getZohoAccessToken(): Promise<string | null> {
  const clientId = process.env.ZOHO_CLIENT_ID || '';
  const clientSecret = process.env.ZOHO_CLIENT_SECRET || '';
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN || process.env.ZOHO_MAIL_API_KEY || '';

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const response = await fetch(ZOHO_ACCOUNTS_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    console.error('[zoho-bounce-sync] token refresh failed', response.status);
    return null;
  }

  const data = (await response.json()) as { access_token?: string };
  return data.access_token || null;
}

function zohoAuthHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Zoho-oauthtoken ${accessToken}`,
    Accept: 'application/json',
  };
}

async function resolveAccountId(accessToken: string): Promise<string | null> {
  const explicit = process.env.ZOHO_ACCOUNT_ID?.trim();
  if (explicit) return explicit;

  const res = await fetch(ZOHO_MAIL_API, {
    headers: zohoAuthHeaders(accessToken),
  });
  if (!res.ok) {
    // Sin ZOHO_ACCOUNT_ID o token sin scope mail: aviso suave (no error de producto).
    console.warn(
      '[zoho-bounce-sync] list accounts failed',
      res.status,
      '— define ZOHO_ACCOUNT_ID o revisa OAuth Mail'
    );
    return null;
  }
  const data = (await res.json()) as {
    data?: Array<{ accountId?: string | number }>;
  };
  const first = data.data?.[0]?.accountId;
  return first != null ? String(first) : null;
}

type ZohoFolder = {
  folderId?: string | number;
  folderName?: string;
  folderType?: string;
};

async function findUndeliveredFolderId(
  accessToken: string,
  accountId: string
): Promise<string | null> {
  const explicit = process.env.ZOHO_UNDELIVERED_FOLDER_ID?.trim();
  if (explicit) return explicit;

  const res = await fetch(`${ZOHO_MAIL_API}/${accountId}/folders`, {
    headers: zohoAuthHeaders(accessToken),
  });
  if (!res.ok) {
    console.error('[zoho-bounce-sync] list folders failed', res.status);
    return null;
  }

  const data = (await res.json()) as { data?: ZohoFolder[] };
  const folders = data.data || [];

  const match = folders.find((f) => {
    const name = String(f.folderName || '').toLowerCase();
    const type = String(f.folderType || '').toLowerCase();
    return (
      name.includes('undeliver') ||
      name.includes('bounce') ||
      name.includes('no entregad') ||
      type.includes('undeliver')
    );
  });

  return match?.folderId != null ? String(match.folderId) : null;
}

type ZohoMessage = {
  subject?: string;
  fromAddress?: string;
  toAddress?: string;
  summary?: string;
  snippet?: string;
  content?: string;
};

function isOurAddress(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return OUR_DOMAINS.has(domain);
}

/** Extrae candidatos a destinatario fallido (excluye direcciones nuestras / mailer-daemon). */
export function extractBounceEmailsFromText(...parts: Array<string | undefined | null>): string[] {
  const blob = parts.filter(Boolean).join(' ');
  const matches = blob.match(EMAIL_RE) || [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of matches) {
    const email = normalizeSuppressionEmail(raw);
    if (!email || seen.has(email)) continue;
    if (isOurAddress(email)) continue;
    if (
      email.startsWith('mailer-daemon@') ||
      email.startsWith('postmaster@') ||
      email.startsWith('noreply@') ||
      email.includes('mailer-daemon')
    ) {
      continue;
    }
    seen.add(email);
    out.push(email);
  }

  return out;
}

async function listUndeliveredMessages(
  accessToken: string,
  accountId: string,
  folderId: string,
  limit: number
): Promise<ZohoMessage[]> {
  const start = 1;
  const url = new URL(`${ZOHO_MAIL_API}/${accountId}/messages/view`);
  url.searchParams.set('folderId', folderId);
  url.searchParams.set('start', String(start));
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 200)));

  const res = await fetch(url.toString(), {
    headers: zohoAuthHeaders(accessToken),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[zoho-bounce-sync] list messages failed', res.status, body.slice(0, 200));
    throw new Error(`Zoho messages/view HTTP ${res.status}`);
  }

  const data = (await res.json()) as { data?: ZohoMessage[] };
  return data.data || [];
}

/**
 * Lee carpeta Undelivered de Zoho Mail EU e inserta emails en suppression (reason=bounce).
 */
export async function syncZohoBounces(options?: {
  limit?: number;
}): Promise<ZohoBounceSyncResult> {
  const limit = options?.limit ?? 100;

  const accessToken = await getZohoAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      accessTokenOk: false,
      accountId: null,
      undeliveredFolderId: null,
      messagesScanned: 0,
      emailsFound: 0,
      inserted: 0,
      skippedExisting: 0,
      error: 'No se pudo obtener access token (revisar ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN)',
      note: 'Fallback: import CSV o auto-suppress SMTP 550',
    };
  }

  const accountId = await resolveAccountId(accessToken);
  if (!accountId) {
    return {
      ok: false,
      accessTokenOk: true,
      accountId: null,
      undeliveredFolderId: null,
      messagesScanned: 0,
      emailsFound: 0,
      inserted: 0,
      skippedExisting: 0,
      error: 'No se pudo resolver accountId (ZOHO_ACCOUNT_ID o GET /api/accounts)',
      note: 'Scope OAuth necesario: ZohoMail.accounts.READ + ZohoMail.messages.READ + ZohoMail.folders.READ',
    };
  }

  const folderId = await findUndeliveredFolderId(accessToken, accountId);
  if (!folderId) {
    return {
      ok: false,
      accessTokenOk: true,
      accountId,
      undeliveredFolderId: null,
      messagesScanned: 0,
      emailsFound: 0,
      inserted: 0,
      skippedExisting: 0,
      error: 'Carpeta Undelivered no encontrada',
      note: 'Definir ZOHO_UNDELIVERED_FOLDER_ID o importar CSV desde Zoho Mail UI',
    };
  }

  let messages: ZohoMessage[];
  try {
    messages = await listUndeliveredMessages(accessToken, accountId, folderId, limit);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      accessTokenOk: true,
      accountId,
      undeliveredFolderId: folderId,
      messagesScanned: 0,
      emailsFound: 0,
      inserted: 0,
      skippedExisting: 0,
      error: msg,
      note: 'Si el scope no permite listar mensajes, usar POST /api/superadmin/email-suppression/import-csv',
    };
  }

  const allEmails = new Set<string>();
  for (const m of messages) {
    for (const e of extractBounceEmailsFromText(
      m.toAddress,
      m.subject,
      m.summary,
      m.snippet,
      m.fromAddress
    )) {
      allEmails.add(e);
    }
  }

  let inserted = 0;
  let skippedExisting = 0;
  for (const email of allEmails) {
    const r = await upsertEmailSuppression({
      email,
      reason: 'bounce',
      source: 'zoho_undelivered',
    });
    if (r.inserted) inserted += 1;
    else skippedExisting += 1;
  }

  // Propaga a captación: status=bounced + tracking
  let leadsMarked = 0;
  try {
    const applied = await applyOutreachBounceEmails([...allEmails], 'zoho_undelivered');
    leadsMarked = applied.leadsMarked;
  } catch (e) {
    console.warn('[zoho-bounce-sync] applyOutreachBounceEmails', e);
  }

  return {
    ok: true,
    accessTokenOk: true,
    accountId,
    undeliveredFolderId: folderId,
    messagesScanned: messages.length,
    emailsFound: allEmails.size,
    inserted,
    skippedExisting,
    leadsMarked,
  };
}
