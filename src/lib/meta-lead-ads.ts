import crypto from 'crypto';

export type MetaLeadField = { name: string; values: string[] };

export type MetaLeadgenPayload = {
  leadgen_id: string;
  page_id?: string;
  form_id?: string;
  ad_id?: string;
  adgroup_id?: string;
  campaign_id?: string;
  created_time?: number;
};

export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader?.startsWith('sha256=') || !appSecret) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const received = signatureHeader.slice('sha256='.length);
  if (expected.length !== received.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
  } catch {
    return false;
  }
}

export function parseMetaLeadgenWebhook(body: unknown): MetaLeadgenPayload[] {
  const leads: MetaLeadgenPayload[] = [];
  if (!body || typeof body !== 'object') return leads;
  const obj = body as Record<string, unknown>;
  if (obj.object !== 'page') return leads;

  const entries = Array.isArray(obj.entry) ? obj.entry : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const changes = Array.isArray((entry as Record<string, unknown>).changes)
      ? (entry as Record<string, unknown>).changes
      : [];
    for (const change of changes) {
      if (!change || typeof change !== 'object') continue;
      const c = change as Record<string, unknown>;
      if (c.field !== 'leadgen') continue;
      const value = c.value;
      if (!value || typeof value !== 'object') continue;
      const v = value as Record<string, unknown>;
      const leadgenId = String(v.leadgen_id || '').trim();
      if (!leadgenId) continue;
      leads.push({
        leadgen_id: leadgenId,
        page_id: v.page_id != null ? String(v.page_id) : undefined,
        form_id: v.form_id != null ? String(v.form_id) : undefined,
        ad_id: v.ad_id != null ? String(v.ad_id) : undefined,
        adgroup_id: v.adgroup_id != null ? String(v.adgroup_id) : undefined,
        campaign_id: v.campaign_id != null ? String(v.campaign_id) : undefined,
        created_time:
          typeof v.created_time === 'number' ? v.created_time : Number(v.created_time) || undefined,
      });
    }
  }
  return leads;
}

export function parseLeadFieldData(fieldData: MetaLeadField[]): {
  email: string | null;
  name: string | null;
  raw: Record<string, string>;
} {
  const raw: Record<string, string> = {};
  for (const field of fieldData) {
    const key = String(field.name || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/\s+/g, '_');
    const val = (field.values && field.values[0]) || '';
    if (key) raw[key] = val;
  }

  const email =
    raw.email ||
    raw.correo_electronico ||
    raw.correo ||
    raw.e_mail ||
    raw.mail ||
    null;

  const name =
    raw.full_name ||
    raw.nombre_completo ||
    raw.nombre_y_apellidos ||
    [raw.first_name, raw.last_name].filter(Boolean).join(' ').trim() ||
    raw.nombre ||
    null;

  return { email: email ? email.trim().toLowerCase() : null, name: name?.trim() || null, raw };
}

export async function fetchMetaLeadById(
  leadgenId: string,
  accessToken: string
): Promise<{ field_data: MetaLeadField[] } | null> {
  const version = process.env.META_GRAPH_API_VERSION || 'v21.0';
  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(
    leadgenId
  )}?access_token=${encodeURIComponent(accessToken)}`;

  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[meta-lead-ads] fetch lead failed', res.status, text.slice(0, 500));
    return null;
  }
  const data = (await res.json()) as { field_data?: MetaLeadField[] };
  if (!Array.isArray(data.field_data)) return null;
  return { field_data: data.field_data };
}

export function buildWaitlistNotesFromMetaLead(
  payload: MetaLeadgenPayload,
  extra?: Record<string, string>
): string {
  const parts = [
    `meta_leadgen_id=${payload.leadgen_id}`,
    payload.form_id ? `form_id=${payload.form_id}` : '',
    payload.campaign_id ? `campaign_id=${payload.campaign_id}` : '',
    payload.ad_id ? `ad_id=${payload.ad_id}` : '',
  ].filter(Boolean);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) parts.push(`${k}=${v.replace(/\s+/g, '_').slice(0, 200)}`);
    }
  }
  return parts.join(';');
}
