import nodemailer from 'nodemailer';
import { sql } from '@/lib/db';

// Usar el mismo transporter que funciona en booking (email-notifications.ts)
// Esto asegura consistencia y que funcione igual que los emails de reservas
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
  },
});

export function getTransport() {
  // Validar que SMTP esté configurado
  const host = process.env.SMTP_HOST || '';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

  if (!host || !user || !pass) {
    const missing = [];
    if (!host) missing.push('SMTP_HOST');
    if (!user) missing.push('SMTP_USER');
    if (!pass) missing.push('SMTP_PASS o SMTP_PASSWORD');
    
    throw new Error(`❌ SMTP no configurado correctamente. Faltan: ${missing.join(', ')}`);
  }

  return transporter;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export type OnboardingEmailVariant = 'default' | 'waitlist_launch' | 'web_plan_paid';

function normalizeOnboardingVariant(v?: OnboardingEmailVariant): OnboardingEmailVariant {
  if (v === 'waitlist_launch' || v === 'web_plan_paid') return v;
  return 'default';
}

export async function sendOnboardingEmail(params: {
  to: string;
  onboardingUrl: string;
  tempPassword?: string;
  /** Si existe, se guarda en email_tracking para métricas/superadmin. */
  tenantId?: string;
  /** waitlist_launch: solo activación lista de espera (superadmin). web_plan_paid: alta tras pago en web/Polar (landing o /subscribe). */
  variant?: OnboardingEmailVariant;
}) {
  let trackingId: string | null = null;
  try {
    // Validar que SMTP esté configurado antes de intentar enviar
    const transporter = getTransport();
    
    // Email específico para onboarding de propietarios (admin)
    const from = process.env.SMTP_FROM_ONBOARDING || process.env.SMTP_FROM || `Delfín Check-in <noreply@delfincheckin.com>`;

    const variant = normalizeOnboardingVariant(params.variant);

    const rawOnboardingUrl = params.onboardingUrl;
    const href = escapeHtmlAttr(rawOnboardingUrl);
    const plainUrlText = escapeHtmlText(rawOnboardingUrl);
    const pwdBlock = params.tempPassword
      ? `
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f9fa;border-left:4px solid #2563eb;border-radius:4px;">
                <tr>
                  <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333333;line-height:1.5;">
                    <p style="margin:0 0 8px 0;"><strong>Contraseña temporal:</strong></p>
                    <p style="margin:0;font-size:18px;font-family:Consolas,Monaco,monospace;letter-spacing:1px;"><strong>${escapeHtmlText(params.tempPassword)}</strong></p>
                    <p style="margin:12px 0 0 0;font-size:12px;color:#666666;">Podrás cambiarla durante el proceso de onboarding.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
      : '';

    const heroTitle =
      variant === 'waitlist_launch'
        ? 'Tu software Delfín Check-in ya está listo'
        : variant === 'web_plan_paid'
          ? 'Suscripción confirmada'
          : 'Bienvenido a Delfín Check-in';
    const heroSubtitle =
      variant === 'waitlist_launch'
        ? 'Puedes probarlo gratis con una propiedad — te guiamos en el onboarding'
        : variant === 'web_plan_paid'
          ? 'Un último paso: configura tu cuenta en el panel web'
          : 'Tu plataforma de gestión de alojamientos';
    const bodyHeading =
      variant === 'waitlist_launch'
        ? '¡Gracias por confiar en la lista de espera!'
        : variant === 'web_plan_paid'
          ? 'Accede y termina la configuración'
          : '¡Listo para empezar!';
    const bodyLead =
      variant === 'waitlist_launch'
        ? 'Ya hemos activado tu acceso. El panel web te guía paso a paso (país, unidades, integraciones). Puedes usar el plan gratuito para <strong>una propiedad</strong> sin coste mientras exploras.'
        : variant === 'web_plan_paid'
          ? 'Gracias por contratar Delfín Check-in. Hemos creado tu espacio de trabajo: el enlace siguiente abre el <strong>onboarding</strong> (datos del negocio, unidades, integraciones). La facturación recurrente de tu plan se gestiona de forma segura en la web con nuestro partner de pagos (Polar), como viste en el checkout.'
          : 'Tu cuenta ha sido creada correctamente. Para completar la configuración inicial y entrar en tu panel, usa el botón siguiente:';
    const waitlistAppsNote =
      variant === 'waitlist_launch'
        ? `
          <tr>
            <td style="padding:0 32px 16px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eff6ff;border-left:4px solid #2563eb;border-radius:4px;">
                <tr>
                  <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1e3a8a;">
                    <strong>App móvil (propietarios):</strong> las versiones para <strong>Android (Google Play)</strong> e <strong>iOS (App Store)</strong> están <strong>en revisión</strong> en las tiendas. Mientras tanto puedes usar el panel web en el ordenador o el móvil; te avisaremos cuando las tiendas las publiquen.
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
        : variant === 'web_plan_paid'
          ? `
          <tr>
            <td style="padding:0 32px 16px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0fdf4;border-left:4px solid #16a34a;border-radius:4px;">
                <tr>
                  <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#14532d;">
                    <strong>Sobre las apps móviles:</strong> puedes gestionar tu alojamiento desde el <strong>panel web</strong> en cualquier dispositivo. La suscripción del software no se contrata dentro de las tiendas de aplicaciones; el cobro recurrente lo haces en la web, como acabas de hacer.
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
        : '';

    const subject =
      variant === 'waitlist_launch'
        ? '🐬 Delfín Check-in: ya puedes probarlo (lista de espera)'
        : variant === 'web_plan_paid'
          ? '🐬 Delfín Check-in: confirma tu acceso (suscripción web)'
          : '🐬 Bienvenido a Delfín Check-in - Completa tu configuración';

    const text =
      variant === 'waitlist_launch'
        ? `
🐬 Delfín Check-in — acceso desde la lista de espera

Ya puedes probar el software de gestión para una propiedad de forma gratuita.

Enlace para completar el onboarding (panel web):
${params.onboardingUrl}

${params.tempPassword ? `Contraseña temporal: ${params.tempPassword}\n` : ''}
App móvil: las versiones Android (Google Play) e iOS (App Store) están en revisión en las tiendas; mientras tanto usa el panel web.

Si no ves el correo, revisa Spam o Promociones.

© ${new Date().getFullYear()} Delfín Check-in
        `.trim()
        : variant === 'web_plan_paid'
          ? `
🐬 Delfín Check-in — suscripción activa

Gracias por contratar Delfín Check-in. Completa el onboarding en el panel web:

${params.onboardingUrl}

${params.tempPassword ? `Contraseña temporal: ${params.tempPassword}\n` : ''}
La facturación recurrente del plan se gestiona en la web (Polar), como en el checkout. La suscripción del software no se contrata en las tiendas de apps.

Si no ves el correo, revisa Spam o Promociones.

© ${new Date().getFullYear()} Delfín Check-in
          `.trim()
          : `
🐬 Bienvenido a Delfín Check-in

¡Bienvenido a Delfín Check-in!

Tu cuenta ha sido creada exitosamente. Para completar tu configuración inicial, visita:

${params.onboardingUrl}

${params.tempPassword ? `\n🔑 Contraseña temporal: ${params.tempPassword}\n` : ''}

Si tienes problemas, revisa tu carpeta de Spam/Correo no deseado.

© ${new Date().getFullYear()} Delfín Check-in
        `.trim();

    const appBase = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(/\/+$/, '');

    let trackedHref = rawOnboardingUrl;
    let trackingPixel = '';

    try {
      const meta = await sql`
        SELECT to_regclass('public.email_tracking') as reg
      `;
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
            ${params.tenantId || null},
            'onboarding',
            ${params.to},
            ${subject},
            'sent',
            ${JSON.stringify({ variant })}::jsonb
          )
          RETURNING id
        `;
        trackingId = String(inserted.rows[0]?.id || '');

        const openPixelUrl = `${appBase}/api/track/email-open?tid=${encodeURIComponent(trackingId)}`;
        const clickUrl = `${appBase}/api/track/email-click?tid=${encodeURIComponent(trackingId)}&url=${encodeURIComponent(rawOnboardingUrl)}`;
        trackedHref = clickUrl;
        trackingPixel = `<img src="${escapeHtmlAttr(openPixelUrl)}" alt="" width="1" height="1" style="display:none;border:0;outline:none;text-decoration:none;" />`;
      }
    } catch (e) {
      console.warn('⚠️ [SEND ONBOARDING EMAIL] No se pudo preparar tracking de email:', e);
    }

    const hrefTracked = escapeHtmlAttr(trackedHref);

    // Plantilla en tablas + estilos inline: Gmail y Outlook suelen romper div+margin y <style> en <head>
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Bienvenido a Delfín Check-in</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td align="center" style="padding:32px 24px;background-color:#5b63d9;">
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;color:#ffffff;font-weight:bold;">${heroTitle}</h1>
              <p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;color:#e8e9ff;">${heroSubtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;">
              <h2 style="margin:0 0 16px 0;font-size:20px;line-height:1.3;color:#111827;">${bodyHeading}</h2>
              <p style="margin:0 0 16px 0;">${bodyLead}</p>
            </td>
          </tr>
          ${waitlistAppsNote}
          <tr>
            <td align="center" style="padding:8px 32px 24px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td align="center" bgcolor="#2563eb" style="background-color:#2563eb;border-radius:8px;">
                    <a href="${hrefTracked}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff !important;text-decoration:none;border-radius:8px;">Comenzar onboarding</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${pwdBlock}
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fff8e6;border-left:4px solid #e6a800;border-radius:4px;">
                <tr>
                  <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#6d5200;">
                    <strong>Importante:</strong> si no ves este correo en la bandeja de entrada, revisa <strong>Spam</strong> o <strong>Promociones</strong> y márcalo como correo deseado.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#4b5563;">
              <p style="margin:0 0 8px 0;">Si el botón no funciona, copia y pega este enlace en el navegador:</p>
              <p style="margin:0;word-break:break-all;font-size:13px;color:#2563eb;">${plainUrlText}</p>
            </td>
          </tr>
          ${trackingPixel}
          <tr>
            <td style="padding:20px 24px;background-color:#f8f9fa;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;text-align:center;">
              <p style="margin:0;">Este mensaje es automático; por favor no respondas a este correo.</p>
              <p style="margin:8px 0 0 0;">© ${new Date().getFullYear()} Delfín Check-in</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    console.log('📧 [SEND ONBOARDING EMAIL] Intentando enviar email:', {
      to: params.to,
      from,
      hasOnboardingUrl: !!params.onboardingUrl,
      onboardingUrlPrefix: params.onboardingUrl.substring(0, 50) + '...',
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD))
    });

    const result = await transporter.sendMail({
      from,
      to: params.to,
      subject,
      html,
      text, // Versión texto plano para mejor deliverability
      // Headers adicionales para evitar spam
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
      },
    });

    console.log('✅ [SEND ONBOARDING EMAIL] Email enviado exitosamente:', {
      messageId: result.messageId,
      to: params.to,
      accepted: result.accepted,
      rejected: result.rejected
    });

    if (trackingId) {
      try {
        await sql`
          UPDATE email_tracking
          SET
            status = 'sent',
            message_id = ${result.messageId || null},
            updated_at = NOW()
          WHERE id = ${trackingId}::uuid
        `;
      } catch (e) {
        console.warn('⚠️ [SEND ONBOARDING EMAIL] No se pudo actualizar email_tracking tras envío:', e);
      }
    }

    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    if (trackingId) {
      try {
        await sql`
          UPDATE email_tracking
          SET
            status = 'failed',
            metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
              error: error?.message || 'send_failed',
            })}::jsonb,
            updated_at = NOW()
          WHERE id = ${trackingId}::uuid
        `;
      } catch (e) {
        console.warn('⚠️ [SEND ONBOARDING EMAIL] No se pudo marcar email_tracking como failed:', e);
      }
    }

    console.error('❌ [SEND ONBOARDING EMAIL] Error enviando email de onboarding:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      to: params.to,
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD))
    });
    
    // Re-lanzar el error para que el webhook pueda manejarlo
    throw error;
  }
}

export async function sendPaymentNotificationEmail(params: {
  to: string;
  type: 'payment_failed' | 'suspended' | 'payment_succeeded';
  tenantName: string;
  amount: number;
  retryCount?: number;
  remainingAttempts?: number;
  invoiceUrl?: string | null;
}) {
  const transporter = getTransport();
  const from = process.env.SMTP_FROM || `Delfín Check-in <noreply@delfincheckin.com>`;

  let subject = '';
  let html = '';

  if (params.type === 'payment_failed') {
    subject = `⚠️ Pago fallido - Delfín Check-in (Intento ${params.retryCount}/3)`;
    html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; max-width:600px; margin:0 auto;">
      <h2 style="color:#dc2626;">⚠️ Pago Fallido</h2>
      <p>Hola ${params.tenantName},</p>
      <p>No hemos podido procesar el pago de tu suscripción a Delfín Check-in.</p>
      <div style="background:#fee2e2; border-left:4px solid #dc2626; padding:16px; margin:20px 0; border-radius:4px;">
        <p style="margin:0;"><strong>Importe:</strong> ${params.amount.toFixed(2)}€</p>
        <p style="margin:8px 0 0 0;"><strong>Intento:</strong> ${params.retryCount}/3</p>
        <p style="margin:8px 0 0 0;"><strong>Intentos restantes:</strong> ${params.remainingAttempts}</p>
      </div>
      <p>Si no actualizas tu método de pago, se intentará cobrar automáticamente ${params.remainingAttempts} ${params.remainingAttempts === 1 ? 'vez más' : 'veces más'}.</p>
      <p><strong>⚠️ Importante:</strong> Si después de 3 intentos fallidos no se puede cobrar, los servicios de Delfín Check-in serán suspendidos automáticamente.</p>
      ${params.invoiceUrl ? `<p><a href="${params.invoiceUrl}" target="_blank" style="background:#2563eb;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Actualizar método de pago</a></p>` : ''}
      <p>Puedes acceder a tu panel de administración para actualizar tu método de pago y ver tus facturas pendientes.</p>
      <hr style="margin:30px 0; border:none; border-top:1px solid #e5e7eb;"/>
      <p style="color:#6b7280; font-size:14px;">Si ya has actualizado tu método de pago, por favor ignora este mensaje.</p>
    </div>`;
  } else if (params.type === 'suspended') {
    subject = '🚫 Servicios Suspendidos - Delfín Check-in';
    html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; max-width:600px; margin:0 auto;">
      <h2 style="color:#dc2626;">🚫 Servicios Suspendidos</h2>
      <p>Hola ${params.tenantName},</p>
      <p>Después de 3 intentos fallidos de pago, hemos suspendido temporalmente los servicios de Delfín Check-in.</p>
      <div style="background:#fee2e2; border-left:4px solid #dc2626; padding:16px; margin:20px 0; border-radius:4px;">
        <p style="margin:0;"><strong>Importe pendiente:</strong> ${params.amount.toFixed(2)}€</p>
      </div>
      <p><strong>¿Qué significa esto?</strong></p>
      <ul>
        <li>Puedes acceder a tu panel de administración para ver tus datos</li>
        <li><strong>No podrás crear nuevos registros de viajeros</strong></li>
        <li><strong>No podrás usar el canal de comunicación</strong></li>
        <li><strong>No se procesarán nuevas reservas</strong></li>
      </ul>
      <p>Para reactivar tus servicios, por favor actualiza tu método de pago y realiza el pago pendiente.</p>
      ${params.invoiceUrl ? `<p><a href="${params.invoiceUrl}" target="_blank" style="background:#dc2626;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Pagar factura pendiente</a></p>` : ''}
      <p>Una vez que el pago se procese correctamente, tus servicios se reactivarán automáticamente.</p>
      <hr style="margin:30px 0; border:none; border-top:1px solid #e5e7eb;"/>
      <p style="color:#6b7280; font-size:14px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
    </div>`;
  } else if (params.type === 'payment_succeeded') {
    subject = '✅ Pago Exitoso - Delfín Check-in';
    html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6; max-width:600px; margin:0 auto;">
      <h2 style="color:#059669;">✅ Pago Procesado Exitosamente</h2>
      <p>Hola ${params.tenantName},</p>
      <p>Tu pago de ${params.amount.toFixed(2)}€ ha sido procesado correctamente.</p>
      <p>Tu suscripción a Delfín Check-in está activa y todos los servicios están disponibles.</p>
      <p>Gracias por confiar en nosotros.</p>
    </div>`;
  }

  await transporter.sendMail({
    from,
    to: params.to,
    subject,
    html,
  });
}


