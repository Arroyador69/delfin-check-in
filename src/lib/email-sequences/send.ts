import { sql } from '@/lib/db';
import { getTransport } from '@/lib/mailer';
import { renderLifecycleTemplate } from '@/lib/email-sequences/templates';
import { buildUnsubscribeUrl } from '@/lib/email-sequences/unsubscribe';
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

  const appBase = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );

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
        })}::jsonb
      )
      RETURNING id
    `;
    trackingId = String(inserted.rows[0]?.id || '');
  } catch (e) {
    console.warn('sendLifecycleEmail: tracking insert failed', e);
  }

  const openPixel =
    trackingId
      ? `<img src="${appBase}/api/track/email-open?tid=${encodeURIComponent(trackingId)}" alt="" width="1" height="1" style="display:none;border:0;" />`
      : '';

  const html = content.html.replace('</body>', `${openPixel}</body>`);

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

export function buildTrackedCtaUrl(trackingId: string, targetUrl: string): string {
  const appBase = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
  return `${appBase}/api/track/email-click?tid=${encodeURIComponent(trackingId)}&url=${encodeURIComponent(targetUrl)}`;
}

export function buildLifecycleUrls(tenantId: string): { onboardingUrl: string; billingUrl: string } {
  const appBase = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
  return {
    onboardingUrl: `${appBase}/es/onboarding`,
    billingUrl: `${appBase}/es/settings/billing`,
  };
}
