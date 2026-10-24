import { sql } from '@/lib/db';
import { sendOutreachMail } from './send-smtp';
import { buildColdOutreachEmail } from './template';
import { buildOutreachOptOutUrl } from './optout';
import { buildOutreachActivateUrl } from './activate-link';
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

/**
 * CTA principal: 1 clic → crea tenant FREE + email onboarding (enlace firmado).
 * Fallback landing #empezar con email prefijado si OUTREACH_ONE_CLICK=0.
 */
function signupUrlForLead(leadEmail: string): string {
  const oneClick = String(process.env.OUTREACH_ONE_CLICK || '1').trim() !== '0';
  if (oneClick && leadEmail.includes('@')) {
    return buildOutreachActivateUrl(leadEmail);
  }
  const raw = String(
    process.env.OUTREACH_SIGNUP_URL || 'https://delfincheckin.com/parte-viajeros/#empezar'
  ).trim();
  const withHash = raw.includes('#') ? raw : `${raw.replace(/\/+$/, '')}/#empezar`;
  const [beforeHash, hash = 'empezar'] = withHash.split('#');
  const u = new URL(beforeHash.includes('://') ? beforeHash : `https://${beforeHash}`);
  u.searchParams.set('utm_source', 'email');
  u.searchParams.set('utm_medium', 'outreach');
  u.searchParams.set('utm_campaign', PUBLIC_OWNER_LEADS_CAMPAIGN);
  u.searchParams.set('utm_content', 'free_trial');
  u.searchParams.set('ref', 'owner_outreach');
  if (leadEmail.includes('@')) {
    u.searchParams.set('email', leadEmail.trim().toLowerCase());
  }
  u.hash = hash || 'empezar';
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
  const signupRaw = signupUrlForLead(email);

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
          ${`${lead.domain || 'tu alojamiento'}: parte de viajeros MIR con prueba gratis`},
          'sent',
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
