import { NextRequest, NextResponse } from 'next/server';
import {
  buildWaitlistNotesFromMetaLead,
  fetchMetaLeadById,
  parseLeadFieldData,
  parseMetaLeadgenWebhook,
  verifyMetaWebhookSignature,
} from '@/lib/meta-lead-ads';
import { signupFreeActivate, waitlistNotesContainsLeadgenId } from '@/lib/signup-free-activate';

export const runtime = 'nodejs';

/**
 * Webhook Meta Lead Ads (formularios instantáneos).
 * GET: verificación al suscribir la app en Meta Developers.
 * POST: nuevo lead → Graph API → signup-free + email onboarding.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN || '';
  if (mode === 'subscribe' && token && challenge && token === expected) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const appSecret = process.env.META_APP_SECRET || '';
  const pageToken = process.env.META_PAGE_ACCESS_TOKEN || '';

  if (!pageToken) {
    console.error('[meta-leads] META_PAGE_ACCESS_TOKEN missing');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  if (appSecret) {
    const sig = req.headers.get('x-hub-signature-256');
    if (!verifyMetaWebhookSignature(rawBody, sig, appSecret)) {
      console.warn('[meta-leads] invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const leadEvents = parseMetaLeadgenWebhook(body);
  if (leadEvents.length === 0) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  const results: Array<{ leadgen_id: string; ok: boolean; detail?: string }> = [];

  for (const event of leadEvents) {
    try {
      if (await waitlistNotesContainsLeadgenId(event.leadgen_id)) {
        results.push({ leadgen_id: event.leadgen_id, ok: true, detail: 'duplicate' });
        continue;
      }

      const lead = await fetchMetaLeadById(event.leadgen_id, pageToken);
      if (!lead) {
        results.push({ leadgen_id: event.leadgen_id, ok: false, detail: 'fetch_failed' });
        continue;
      }

      const { email, name, raw } = parseLeadFieldData(lead.field_data);
      if (!email) {
        console.error('[meta-leads] no email in lead', event.leadgen_id, raw);
        results.push({ leadgen_id: event.leadgen_id, ok: false, detail: 'no_email' });
        continue;
      }

      const notes = buildWaitlistNotesFromMetaLead(event, raw);
      const activateRes = await signupFreeActivate({
        email,
        name,
        source: 'meta_instant_form',
        notes,
        locale: 'es',
        req,
        bodyExtra: {
          meta_leadgen_id: event.leadgen_id,
          meta_form_id: event.form_id,
          meta_campaign_id: event.campaign_id,
        },
      });

      const data = await activateRes.json().catch(() => ({}));
      const ok = activateRes.ok && data.success !== false;
      results.push({
        leadgen_id: event.leadgen_id,
        ok,
        detail: ok ? 'activated' : String(data.error || activateRes.status),
      });

      if (!ok) {
        console.error('[meta-leads] activate failed', event.leadgen_id, data);
      }
    } catch (e) {
      console.error('[meta-leads] process error', event.leadgen_id, e);
      results.push({ leadgen_id: event.leadgen_id, ok: false, detail: 'exception' });
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results });
}
