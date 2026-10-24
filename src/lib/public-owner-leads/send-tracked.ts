import { sql } from '@/lib/db';
import { sendOutreachMail } from './send-smtp';
import { buildColdOutreachEmail } from './template';
import { buildOutreachOptOutUrl } from './optout';
import {
  PUBLIC_OWNER_LEADS_CAMPAIGN,
  PUBLIC_OWNER_LEADS_EMAIL_TYPE,
} from './constants';

function appBase(): string {
  return String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
}

function wrapClick(trackingId: string, url: string): string {
  const base = appBase();
  return `${base}/api/track/email-click?tid=${encodeURIComponent(trackingId)}&url=${encodeURIComponent(url)}`;
}

function signupUrlWithUtm(): string {
  const base = String(
    process.env.OUTREACH_SIGNUP_URL || 'https://delfincheckin.com/parte-viajeros/'
  ).replace(/\/+$/, '');
  const u = new URL(base.includes('://') ? base : `https://${base}`);
  u.searchParams.set('utm_source', 'email');
  u.searchParams.set('utm_medium', 'outreach');
  u.searchParams.set('utm_campaign', PUBLIC_OWNER_LEADS_CAMPAIGN);
  u.searchParams.set('utm_content', 'free_trial');
  u.searchParams.set('ref', 'owner_outreach');
  return u.toString();
}

export async function sendTrackedOutreachLead(lead: {
  id: string;
  email: string;
  domain: string;
  source_url: string;
}): Promise<{ ok: boolean; trackingId?: string; error?: string }> {
  const email = lead.email.trim().toLowerCase();
  const optOutUrl = buildOutreachOptOutUrl(email, 'es');
  const signupRaw = signupUrlWithUtm();

  let trackingId = '';
  try {
    const meta = await sql`SELECT to_regclass('public.email_tracking') AS reg`;
    if (meta.rows[0]?.reg) {
      const inserted = await sql`
        INSERT INTO email_tracking (
          tenant_id,
          email_type,
          recipient_email,
          subject,
          status,
          metadata
        ) VALUES (
          NULL,
          ${PUBLIC_OWNER_LEADS_EMAIL_TYPE},
          ${email},
          ${`Prueba gratis Delfín Check-in para ${lead.domain || 'tu alojamiento'} (registro MIR)`},
          'queued',
          ${JSON.stringify({
            campaign: PUBLIC_OWNER_LEADS_CAMPAIGN,
            lead_id: lead.id,
            source_url: lead.source_url,
            domain: lead.domain,
          })}::jsonb
        )
        RETURNING id
      `;
      trackingId = String(inserted.rows[0]?.id || '');
    }
  } catch (e) {
    console.warn('[outreach-send] no tracking row:', e);
  }

  const trackedSignup = trackingId ? wrapClick(trackingId, signupRaw) : signupRaw;
  const mail = buildColdOutreachEmail({
    toEmail: email,
    domain: lead.domain,
    sourceUrl: lead.source_url,
    optOutUrl,
    signupUrl: trackedSignup,
  });

  let html = mail.html;
  if (trackingId) {
    const pixel = `${appBase()}/api/track/email-open?tid=${encodeURIComponent(trackingId)}`;
    html = html.replace(
      '</body>',
      `<img src="${pixel}" alt="" width="1" height="1" style="display:none;border:0;" /></body>`
    );
  }

  try {
    const info = await sendOutreachMail({
      to: email,
      subject: mail.subject,
      text: mail.text.replace(trackedSignup, signupRaw),
      html,
      optOutUrl,
    });

    if (trackingId) {
      await sql`
        UPDATE email_tracking
        SET status = 'sent', message_id = ${info.messageId || null}, updated_at = NOW()
        WHERE id = ${trackingId}::uuid
      `;
    }

    await sql`
      UPDATE public_owner_leads
      SET
        status = 'sent',
        sent_at = NOW(),
        updated_at = NOW(),
        tracking_id = COALESCE(${trackingId || null}::uuid, tracking_id),
        last_error = NULL,
        notes = COALESCE(notes, '') || ${` | sent:${new Date().toISOString().slice(0, 10)}`}
      WHERE id = ${lead.id}::uuid
    `;

    return { ok: true, trackingId: trackingId || undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (trackingId) {
      try {
        await sql`
          UPDATE email_tracking
          SET status = 'failed', updated_at = NOW()
          WHERE id = ${trackingId}::uuid
        `;
      } catch {
        /* ignore */
      }
    }
    await sql`
      UPDATE public_owner_leads
      SET
        status = 'skipped',
        updated_at = NOW(),
        last_error = ${msg.slice(0, 400)},
        notes = COALESCE(notes, '') || ' | send-fail'
      WHERE id = ${lead.id}::uuid
    `;
    return { ok: false, error: msg };
  }
}
