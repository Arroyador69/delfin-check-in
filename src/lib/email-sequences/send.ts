import { sql } from '@/lib/db';
import { getTransport } from '@/lib/mailer';
import { renderLifecycleTemplate } from '@/lib/email-sequences/templates';
import { buildUnsubscribeUrl } from '@/lib/email-sequences/unsubscribe';
import {
  buildLifecycleAntivirusHelpUrl,
  getAppBaseUrl,
} from '@/lib/email-sequences/email-links';
import { buildOpenTrackingPixelHtml } from '@/lib/email-tracking-pixel';
import type { LifecycleTemplateParams } from '@/lib/email-sequences/templates';

export interface SendLifecycleEmailParams {
  tenantId: string;
  to: string;
  templateKey: string;
  sequenceKey: string;
  stepOrder: number;
  enrollmentId: string;
  templateParams: Omit<LifecycleTemplateParams, 'unsubscribeUrl'>;
  /** Reintento del mismo paso (sin apertura previa). */
  isRetry?: boolean;
  retryNumber?: number;
}

function lifecycleAntivirusBlock(helpUrl: string): string {
  return `<tr>
    <td style="padding:0 32px 16px 32px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:6px;">
        <tr><td style="padding:16px 18px;font-size:14px;line-height:1.55;color:#1e3a8a;">
          <strong>¿Tu antivirus (Avast u otro) bloquea el enlace?</strong><br/>
          Algunos antivirus marcan enlaces de activación como «phishing» por error. Puedes copiar el enlace del botón en el navegador o seguir nuestra guía.
          <br/><br/>
          <a href="${helpUrl.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:bold;">Ver guía paso a paso</a>
        </td></tr>
      </table>
    </td>
  </tr>`;
}

export async function sendLifecycleEmail(
  params: SendLifecycleEmailParams
): Promise<{ success: boolean; trackingId?: string; messageId?: string; error?: string }> {
  const to = params.to.trim().toLowerCase();
  const unsubscribeUrl = buildUnsubscribeUrl(to);
  const content = renderLifecycleTemplate(params.templateKey, {
    ...params.templateParams,
    unsubscribeUrl,
  });

  const subject =
    params.isRetry && params.retryNumber
      ? `¿Viste nuestro mensaje? (${params.retryNumber}) — ${content.subject}`
      : params.isRetry
        ? `¿Viste nuestro mensaje? — ${content.subject}`
        : content.subject;

  const helpUrl = buildLifecycleAntivirusHelpUrl('es');

  let trackingId: string | null = null;

  try {
    const inserted = await sql`
      INSERT INTO email_tracking (
        tenant_id,
        email_type,
        recipient_email,
        subject,
        status,
        metadata
      ) VALUES (
        ${params.tenantId}::uuid,
        'custom',
        ${to},
        ${subject},
        'sent',
        ${JSON.stringify({
          lifecycle: true,
          sequence_key: params.sequenceKey,
          template_key: params.templateKey,
          step_order: params.stepOrder,
          enrollment_id: params.enrollmentId,
          is_retry: Boolean(params.isRetry),
          retry_number: params.retryNumber ?? 0,
          cta_direct: true,
        })}::jsonb
      )
      RETURNING id
    `;
    trackingId = String(inserted.rows[0]?.id || '');
  } catch (e) {
    console.warn('sendLifecycleEmail: tracking insert failed', e);
  }

  const openPixel = trackingId ? buildOpenTrackingPixelHtml(trackingId) : '';

  const html = content.html
    .replace(
      '<!-- LIFECYCLE_ANTIVIRUS_BLOCK -->',
      lifecycleAntivirusBlock(helpUrl)
    )
    .replace('</body>', `${openPixel}</body>`);

  const from =
    process.env.SMTP_FROM_ONBOARDING ||
    process.env.SMTP_FROM ||
    'Delfín Check-in <noreply@delfincheckin.com>';

  try {
    const transporter = getTransport();
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: content.text,
    });

    if (trackingId && info.messageId) {
      await sql`
        UPDATE email_tracking
        SET message_id = ${String(info.messageId)}, updated_at = NOW()
        WHERE id = ${trackingId}::uuid
      `;
    }

    return { success: true, trackingId: trackingId || undefined, messageId: info.messageId };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (trackingId) {
      await sql`
        UPDATE email_tracking SET status = 'failed', updated_at = NOW() WHERE id = ${trackingId}::uuid
      `.catch(() => undefined);
    }
    return { success: false, error: msg };
  }
}

/** @deprecated CTAs lifecycle van directos; no usar redirect de clic. */
export function buildTrackedCtaUrl(_trackingId: string, targetUrl: string): string {
  return targetUrl;
}

export function buildLifecycleUrls(tenantId: string): { onboardingUrl: string; billingUrl: string } {
  const appBase = getAppBaseUrl();
  return {
    onboardingUrl: `${appBase}/es/onboarding`,
    billingUrl: `${appBase}/es/settings/billing`,
  };
}
